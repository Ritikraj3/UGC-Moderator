#!/usr/bin/env node
'use strict';

/**
 * API Contract Validator
 *
 * Validates every contract under contracts/ against the schema rules
 * defined in docs/template.md. Files under docs/ are never validated.
 *
 * Usage:
 *   node validate.js
 *
 * Exit codes:
 *   0  all files passed
 *   1  one or more files failed
 *
 * Checks covered:
 *
 *  operation
 *    - display_name: present and non-empty
 *    - description: present, non-empty, at least 30 characters
 *    - tags: array if present
 *    - idempotent: present, must be boolean
 *
 *  transport
 *    - at least one of rest: or graphql: must be present
 *    rest:
 *      - method: present, one of GET POST PUT PATCH DELETE
 *      - path: present, must start with /
 *      - auth: present, one of bearer_token api_key session_cookie none
 *      - rate_limit (if present): requests is positive number, window and scope are valid values
 *      - path_params: required when path contains {param} placeholders; each param must be defined
 *    graphql:
 *      - operation_type: present, one of query mutation subscription
 *      - operation_name: present and non-empty
 *      - return_type: present and non-empty
 *      - example_document: present and non-empty
 *
 *  input.fields (each field)
 *    - name: present and non-empty
 *    - type: present, one of the valid types
 *    - required: present (input fields only)
 *    - nullable: present
 *    - description: present and non-empty
 *    - example: present (may be null)
 *    - format: must be a recognised value if present
 *    type-specific:
 *      string  — at least one of min_length, max_length, format, pattern;
 *                pattern requires pattern_description
 *      integer/float — min_value and/or max_value required
 *      enum    — enum_values required; each entry must have value and description
 *      id/uuid — depends_on required on input fields (unless read_only or computed)
 *      array   — items with type required; min_items and/or max_items required on input;
 *                items of type object must have a non-empty fields array (validated recursively)
 *      object  — non-empty fields array required (validated recursively)
 *
 *  depends_on (cross-file)
 *    - operation: present (path to source contract without .yml)
 *    - field_returned: present
 *    - pass_as: present
 *    - referenced contract file must exist
 *    - field_returned must appear in the referenced contract's response.success.fields (recursive search)
 *
 *  rules
 *    - id: present, snake_case, unique within the file
 *    - description, when, then, error_message: present and non-empty
 *    - error_code: present, SCREAMING_SNAKE_CASE
 *    - fields_involved: non-empty array; every name must be a known input field
 *
 *  required_if_rules
 *    - field: present, must be a known input field
 *    - required_when: present and non-empty
 *    - error_code: present, SCREAMING_SNAKE_CASE
 *    - error_message: present and non-empty
 *
 *  exclusive_field_groups
 *    - fields: array with at least 2 entries; every name must be a known input field
 *    - error_code: present, SCREAMING_SNAKE_CASE
 *    - error_message: present and non-empty
 *
 *  response.success
 *    - http_status: present, valid HTTP status code (100–599)
 *    - description: present and non-empty
 *    - fields: non-empty array (unless http_status is 204); each field validated as above
 *
 *  response.errors
 *    - auth_errors: required, non-empty
 *    - system_errors: required, non-empty
 *    - validation_errors, business_errors: optional
 *    each error entry:
 *      - code: present, SCREAMING_SNAKE_CASE
 *      - http_status: present, valid HTTP status code
 *      - graphql_extension_code: required only when contract has a graphql: block
 *      - message: present and non-empty
 *      - description: present and non-empty
 */

// ── Dependency check ───────────────────────────────────────────────────────────
let yaml;
try {
  yaml = require('js-yaml');
} catch {
  console.error('Error: js-yaml not found. Run: npm install');
  process.exit(1);
}

const fs   = require('fs');
const path = require('path');

// ── Constants ──────────────────────────────────────────────────────────────────
const ROOT           = path.resolve(__dirname, '..');
const CONTRACTS_DIR = path.join(ROOT, 'contracts');

const VALID_TYPES = new Set([
  'string', 'integer', 'float', 'boolean', 'enum',
  'id', 'uuid', 'datetime', 'date', 'array', 'object',
]);

const VALID_FORMATS = new Set([
  'email', 'phone', 'uuid', 'url', 'uri',
  'date', 'datetime', 'slug', 'hex_color',
]);

const VALID_AUTH    = new Set(['bearer_token', 'api_key', 'session_cookie', 'none']);
const VALID_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const VALID_OP_TYPES = new Set(['query', 'mutation', 'subscription']);
const VALID_WINDOWS  = new Set(['minute', 'hour', 'day']);
const VALID_SCOPES   = new Set(['per_user', 'per_ip', 'global']);

// ── Type helpers ───────────────────────────────────────────────────────────────
const isStr   = v => typeof v === 'string';
const isNum   = v => typeof v === 'number' && !isNaN(v);
const isBool  = v => typeof v === 'boolean';
const isArr   = v => Array.isArray(v);
const isObj   = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isScreamingSnake = s => /^[A-Z][A-Z0-9_]*$/.test(s);
const nonEmpty = s => isStr(s) && s.trim().length > 0;

// ── File discovery ─────────────────────────────────────────────────────────────
function findYmlFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findYmlFiles(full));
    else if (entry.name.endsWith('.yml')) out.push(full);
  }
  return out;
}

function loadContract(filePath) {
  try {
    return yaml.load(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return { _parseError: e.message };
  }
}

// ── Recursive response-field search ───────────────────────────────────────────
// Searches fields[], items.fields[], and nested object fields recursively.
function findResponseField(fields, name) {
  if (!isArr(fields)) return null;
  for (const f of fields) {
    if (f.name === name) return f;
    if (f.fields) {
      const found = findResponseField(f.fields, name);
      if (found) return found;
    }
    if (f.items && f.items.fields) {
      const found = findResponseField(f.items.fields, name);
      if (found) return found;
    }
  }
  return null;
}

// ── Validator ──────────────────────────────────────────────────────────────────
class ContractValidator {
  constructor(filePath, contract, allContracts) {
    this.filePath     = filePath;
    this.contract     = contract;
    this.allContracts = allContracts; // absolute-path → parsed yaml
    this.errors       = [];
    this.inputNames   = new Set(); // top-level input field names for cross-checks
    this.hasGraphql   = false;     // set true when graphql: block is present
  }

  err(loc, msg) {
    this.errors.push(`[${loc}] ${msg}`);
  }

  validate() {
    const c = this.contract;
    if (c._parseError) {
      this.err('file', `YAML parse error: ${c._parseError}`);
      return this.errors;
    }
    this.validateOperation(c);
    this.validateTransport(c);
    this.validateInput(c);
    this.validateRules(c);
    this.validateRequiredIfRules(c);
    this.validateExclusiveGroups(c);
    this.validateResponse(c);
    return this.errors;
  }

  // ── operation ──────────────────────────────────────────────────────────────
  validateOperation(c) {
    const op = c.operation;
    if (!op) { this.err('operation', "missing 'operation' section"); return; }

    if (!nonEmpty(op.display_name)) {
      this.err('operation.display_name', "missing or empty 'display_name'");
    }

    if (!nonEmpty(op.description)) {
      this.err('operation.description', "missing or empty 'description'");
    } else if (op.description.trim().length < 30) {
      this.err('operation.description', "description is too brief — explain what the operation does and why it exists (30+ chars)");
    }

    if (op.tags !== undefined && !isArr(op.tags)) {
      this.err('operation.tags', "must be an array");
    }

    if (op.idempotent === undefined) {
      this.err('operation.idempotent', "missing 'idempotent' — set to true or false");
    } else if (!isBool(op.idempotent)) {
      this.err('operation.idempotent', "must be a boolean (true or false)");
    }
  }

  // ── transport ──────────────────────────────────────────────────────────────
  validateTransport(c) {
    if (!c.rest && !c.graphql) {
      this.err('transport', "at least one of 'rest' or 'graphql' section is required");
      return;
    }
    if (c.rest)    this.validateRest(c.rest);
    if (c.graphql) { this.hasGraphql = true; this.validateGraphql(c.graphql); }
  }

  validateRest(rest) {
    if (!rest.method) {
      this.err('rest.method', "missing 'method'");
    } else if (!VALID_METHODS.has(rest.method)) {
      this.err('rest.method', `'${rest.method}' is not valid. Must be one of: ${[...VALID_METHODS].join(', ')}`);
    }

    if (!nonEmpty(rest.path)) {
      this.err('rest.path', "missing or empty 'path'");
    } else if (!rest.path.startsWith('/')) {
      this.err('rest.path', "path must start with '/'");
    }

    if (!rest.auth) {
      this.err('rest.auth', "missing 'auth'");
    } else if (!VALID_AUTH.has(rest.auth)) {
      this.err('rest.auth', `'${rest.auth}' is not valid. Must be one of: ${[...VALID_AUTH].join(', ')}`);
    }

    if (rest.rate_limit) {
      const rl = rest.rate_limit;
      if (!isNum(rl.requests) || rl.requests < 1) {
        this.err('rest.rate_limit.requests', "must be a positive number");
      }
      if (!VALID_WINDOWS.has(rl.window)) {
        this.err('rest.rate_limit.window', `must be one of: ${[...VALID_WINDOWS].join(', ')}`);
      }
      if (!VALID_SCOPES.has(rl.scope)) {
        this.err('rest.rate_limit.scope', `must be one of: ${[...VALID_SCOPES].join(', ')}`);
      }
    }

    // Check all {param} in path have a path_params entry
    const paramMatches = (rest.path || '').match(/\{(\w+)\}/g) || [];
    const paramNames   = paramMatches.map(p => p.slice(1, -1));
    if (paramNames.length > 0) {
      if (!isArr(rest.path_params) || rest.path_params.length === 0) {
        this.err('rest.path_params', `path contains ${paramNames.map(p => `{${p}}`).join(', ')} but 'path_params' is missing`);
      } else {
        const defined = new Set(rest.path_params.map(p => p.name));
        for (const name of paramNames) {
          if (!defined.has(name)) {
            this.err('rest.path_params', `missing definition for path parameter {${name}}`);
          }
        }
      }
    }
  }

  validateGraphql(gql) {
    if (!gql.operation_type) {
      this.err('graphql.operation_type', "missing 'operation_type'");
    } else if (!VALID_OP_TYPES.has(gql.operation_type)) {
      this.err('graphql.operation_type', `must be one of: ${[...VALID_OP_TYPES].join(', ')}`);
    }

    if (!nonEmpty(gql.operation_name)) this.err('graphql.operation_name', "missing or empty 'operation_name'");
    if (!nonEmpty(gql.return_type))    this.err('graphql.return_type',    "missing or empty 'return_type'");

    if (!nonEmpty(gql.example_document)) {
      this.err('graphql.example_document', "missing or empty 'example_document' — include a full copy-pasteable GraphQL document");
    }
  }

  // ── input ──────────────────────────────────────────────────────────────────
  validateInput(c) {
    if (!c.input) { this.err('input', "missing 'input' section"); return; }
    if (!isArr(c.input.fields)) { this.err('input.fields', "must be an array"); return; }
    if (c.input.fields.length === 0) { this.err('input.fields', "must have at least one field"); return; }

    // Collect top-level names for cross-checks
    for (const f of c.input.fields) {
      if (f && f.name) this.inputNames.add(f.name);
    }

    c.input.fields.forEach((field, i) => {
      this.validateField(field, `input.fields[${i}]${field && field.name ? ` (${field.name})` : ''}`, true);
    });
  }

  // ── field (shared for input and response) ──────────────────────────────────
  validateField(field, ctx, isInput) {
    if (!isObj(field)) { this.err(ctx, 'must be a YAML mapping (object)'); return; }

    // Universal required keys
    if (!nonEmpty(field.name)) this.err(ctx, "missing or empty 'name'");

    if (!field.type) {
      this.err(ctx, "missing 'type'");
      return; // can't do type-specific checks without a type
    }
    if (!VALID_TYPES.has(field.type)) {
      this.err(ctx, `invalid 'type' "${field.type}". Valid: ${[...VALID_TYPES].join(', ')}`);
      return;
    }

    if (isInput && field.required === undefined) {
      this.err(ctx, "missing 'required' (input fields must declare required: true or false)");
    }
    if (isInput && field.nullable === undefined) {
      this.err(ctx, "missing 'nullable'");
    }

    if (!nonEmpty(field.description)) {
      this.err(ctx, "missing or empty 'description' — explain what the field is and why it exists");
    }
    if (field.example === undefined) {
      this.err(ctx, "missing 'example' — provide a realistic value (can be null)");
    }

    // format must be a recognised value
    if (field.format !== undefined && !VALID_FORMATS.has(field.format)) {
      this.err(ctx, `invalid 'format' "${field.format}". Valid: ${[...VALID_FORMATS].join(', ')}`);
    }

    // Type-specific — strict for input, lighter for response
    switch (field.type) {
      case 'string':   this.validateStringField(field, ctx, isInput); break;
      case 'integer':
      case 'float':    this.validateNumericField(field, ctx, isInput); break;
      case 'enum':     this.validateEnumField(field, ctx); break;
      case 'id':
      case 'uuid':     this.validateIdField(field, ctx, isInput); break;
      case 'array':    this.validateArrayField(field, ctx, isInput); break;
      case 'object':   this.validateObjectField(field, ctx, isInput); break;
      // boolean, datetime, date — no additional type-specific constraints required
    }

    // depends_on validation
    if (field.depends_on) {
      this.validateDependsOn(field.depends_on, ctx);
    }
  }

  // ── string ─────────────────────────────────────────────────────────────────
  validateStringField(field, ctx, isInput) {
    if (!isInput) return; // response string fields are not constrained by this validator

    const hasConstraint =
      field.min_length !== undefined ||
      field.max_length !== undefined ||
      field.format     !== undefined ||
      field.pattern    !== undefined;

    if (!hasConstraint) {
      this.err(ctx, "string field must have at least one of: min_length, max_length, format, pattern");
    }

    if (field.min_length !== undefined && !isNum(field.min_length)) {
      this.err(ctx, "'min_length' must be a number");
    }
    if (field.max_length !== undefined && !isNum(field.max_length)) {
      this.err(ctx, "'max_length' must be a number");
    }
    if (isNum(field.min_length) && isNum(field.max_length) && field.min_length > field.max_length) {
      this.err(ctx, `min_length (${field.min_length}) cannot exceed max_length (${field.max_length})`);
    }
    if (field.pattern !== undefined && !isStr(field.pattern)) {
      this.err(ctx, "'pattern' must be a string");
    }
    if (field.pattern && !field.pattern_description) {
      this.err(ctx, "a 'pattern' requires a 'pattern_description' explaining what it enforces");
    }
  }

  // ── integer / float ────────────────────────────────────────────────────────
  validateNumericField(field, ctx, isInput) {
    if (!isInput) return;

    if (field.min_value === undefined && field.max_value === undefined) {
      this.err(ctx, `${field.type} field must have 'min_value' and/or 'max_value'`);
    }
    if (field.min_value !== undefined && !isNum(field.min_value)) {
      this.err(ctx, "'min_value' must be a number");
    }
    if (field.max_value !== undefined && !isNum(field.max_value)) {
      this.err(ctx, "'max_value' must be a number");
    }
    if (isNum(field.min_value) && isNum(field.max_value) && field.min_value > field.max_value) {
      this.err(ctx, `min_value (${field.min_value}) cannot exceed max_value (${field.max_value})`);
    }
  }

  // ── enum ───────────────────────────────────────────────────────────────────
  validateEnumField(field, ctx) {
    if (!isArr(field.enum_values) || field.enum_values.length === 0) {
      this.err(ctx, "enum field must have a non-empty 'enum_values' list");
      return;
    }
    field.enum_values.forEach((ev, i) => {
      const loc = `${ctx}.enum_values[${i}]`;
      if (ev.value === undefined || ev.value === null || String(ev.value).trim() === '') {
        this.err(loc, "missing 'value'");
      }
      if (!nonEmpty(ev.description)) {
        this.err(loc, "missing or empty 'description'");
      }
    });
  }

  // ── id / uuid ──────────────────────────────────────────────────────────────
  validateIdField(field, ctx, isInput) {
    // Response fields (isInput=false) never need depends_on —
    // they are being returned by the API, not sourced from elsewhere.
    // Input fields that are read_only or computed are also exempt.
    if (!isInput) return;
    if (field.read_only || field.computed) return;

    if (!field.depends_on) {
      this.err(ctx, "id/uuid input field must have 'depends_on' describing where to get the value, or set read_only: true if it's response-only");
    }
  }

  // ── array ──────────────────────────────────────────────────────────────────
  validateArrayField(field, ctx, isInput) {
    if (!field.items) {
      this.err(ctx, "array field must have 'items'");
      return;
    }
    if (!field.items.type) {
      this.err(`${ctx}.items`, "missing 'type'");
    } else if (!VALID_TYPES.has(field.items.type)) {
      this.err(`${ctx}.items`, `invalid 'type' "${field.items.type}"`);
    }

    if (isInput && field.min_items === undefined && field.max_items === undefined) {
      this.err(ctx, "array input field should have 'min_items' and/or 'max_items'");
    }
    if (field.min_items !== undefined && !isNum(field.min_items)) {
      this.err(ctx, "'min_items' must be a number");
    }
    if (field.max_items !== undefined && !isNum(field.max_items)) {
      this.err(ctx, "'max_items' must be a number");
    }

    // Validate child fields for arrays of objects
    if (field.items && field.items.type === 'object') {
      if (!isArr(field.items.fields) || field.items.fields.length === 0) {
        this.err(`${ctx}.items`, "items of type 'object' must have a non-empty 'fields' array");
      } else {
        field.items.fields.forEach((cf, i) => {
          this.validateField(cf, `${ctx}.items.fields[${i}]${cf && cf.name ? ` (${cf.name})` : ''}`, isInput);
        });
      }
    }
  }

  // ── object ─────────────────────────────────────────────────────────────────
  validateObjectField(field, ctx, isInput) {
    if (!isArr(field.fields) || field.fields.length === 0) {
      this.err(ctx, "object field must have a non-empty 'fields' array");
      return;
    }
    field.fields.forEach((cf, i) => {
      this.validateField(cf, `${ctx}.fields[${i}]${cf && cf.name ? ` (${cf.name})` : ''}`, isInput);
    });
  }

  // ── depends_on ─────────────────────────────────────────────────────────────
  validateDependsOn(dep, ctx) {
    const loc = `${ctx}.depends_on`;
    if (!nonEmpty(dep.operation))      this.err(loc, "missing 'operation' (path to the source operation, without .yml)");
    if (!nonEmpty(dep.field_returned)) this.err(loc, "missing 'field_returned'");
    if (!nonEmpty(dep.pass_as))        this.err(loc, "missing 'pass_as'");

    // Cross-file reference validation
    if (nonEmpty(dep.operation) && nonEmpty(dep.field_returned)) {
      const opAbsPath = path.join(ROOT, dep.operation + '.yml');
      const refContract = this.allContracts[opAbsPath];

      if (!refContract) {
        this.err(loc, `referenced operation '${dep.operation}' not found — expected file at ${dep.operation}.yml`);
      } else if (!refContract._parseError) {
        const refFields = refContract.response && refContract.response.success && refContract.response.success.fields || [];
        const found = findResponseField(refFields, dep.field_returned);
        if (!found) {
          this.err(loc, `field_returned '${dep.field_returned}' not found in ${dep.operation} → response.success.fields (searched recursively)`);
        }
      }
    }
  }

  // ── rules ──────────────────────────────────────────────────────────────────
  validateRules(c) {
    if (!c.rules) return;
    if (!isArr(c.rules)) { this.err('rules', "must be an array"); return; }

    const seenIds = new Set();
    c.rules.forEach((rule, i) => {
      const ctx = `rules[${i}]${rule && rule.id ? ` (${rule.id})` : ''}`;

      if (!nonEmpty(rule.id)) {
        this.err(ctx, "missing or empty 'id'");
      } else {
        if (!/^[a-z][a-z0-9_]*$/.test(rule.id)) {
          this.err(ctx, `'id' must be snake_case, got "${rule.id}"`);
        }
        if (seenIds.has(rule.id)) {
          this.err(ctx, `duplicate rule id '${rule.id}'`);
        }
        seenIds.add(rule.id);
      }

      if (!nonEmpty(rule.description)) this.err(ctx, "missing or empty 'description'");
      if (!nonEmpty(rule.when))        this.err(ctx, "missing or empty 'when' expression");
      if (!nonEmpty(rule.then))        this.err(ctx, "missing or empty 'then' expression");

      if (!rule.error_code) {
        this.err(ctx, "missing 'error_code'");
      } else if (!isScreamingSnake(rule.error_code)) {
        this.err(ctx, `'error_code' must be SCREAMING_SNAKE_CASE, got "${rule.error_code}"`);
      }

      if (!nonEmpty(rule.error_message)) this.err(ctx, "missing or empty 'error_message'");

      if (!isArr(rule.fields_involved) || rule.fields_involved.length === 0) {
        this.err(ctx, "missing or empty 'fields_involved' — list all input field names this rule touches");
      } else {
        for (const fname of rule.fields_involved) {
          if (!this.inputNames.has(fname)) {
            this.err(ctx, `fields_involved references unknown input field '${fname}'`);
          }
        }
      }
    });
  }

  // ── required_if_rules ──────────────────────────────────────────────────────
  validateRequiredIfRules(c) {
    if (!c.required_if_rules) return;
    if (!isArr(c.required_if_rules)) { this.err('required_if_rules', "must be an array"); return; }

    c.required_if_rules.forEach((rule, i) => {
      const ctx = `required_if_rules[${i}]`;
      if (!nonEmpty(rule.field)) {
        this.err(ctx, "missing 'field'");
      } else if (!this.inputNames.has(rule.field)) {
        this.err(ctx, `references unknown input field '${rule.field}'`);
      }
      if (!nonEmpty(rule.required_when)) this.err(ctx, "missing or empty 'required_when'");
      if (!rule.error_code) {
        this.err(ctx, "missing 'error_code'");
      } else if (!isScreamingSnake(rule.error_code)) {
        this.err(ctx, `'error_code' must be SCREAMING_SNAKE_CASE, got "${rule.error_code}"`);
      }
      if (!nonEmpty(rule.error_message)) this.err(ctx, "missing or empty 'error_message'");
    });
  }

  // ── exclusive_field_groups ─────────────────────────────────────────────────
  validateExclusiveGroups(c) {
    if (!c.exclusive_field_groups) return;
    if (!isArr(c.exclusive_field_groups)) { this.err('exclusive_field_groups', "must be an array"); return; }

    c.exclusive_field_groups.forEach((group, i) => {
      const ctx = `exclusive_field_groups[${i}]`;
      if (!isArr(group.fields) || group.fields.length < 2) {
        this.err(ctx, "must have a 'fields' array with at least 2 field names");
      } else {
        for (const fname of group.fields) {
          if (!this.inputNames.has(fname)) {
            this.err(ctx, `references unknown input field '${fname}'`);
          }
        }
      }
      if (!group.error_code) {
        this.err(ctx, "missing 'error_code'");
      } else if (!isScreamingSnake(group.error_code)) {
        this.err(ctx, `'error_code' must be SCREAMING_SNAKE_CASE, got "${group.error_code}"`);
      }
      if (!nonEmpty(group.error_message)) this.err(ctx, "missing or empty 'error_message'");
    });
  }

  // ── response ───────────────────────────────────────────────────────────────
  validateResponse(c) {
    if (!c.response) { this.err('response', "missing 'response' section"); return; }

    if (!c.response.success) {
      this.err('response.success', "missing 'success' section");
    } else {
      this.validateSuccess(c.response.success);
    }

    if (!c.response.errors) {
      this.err('response.errors', "missing 'errors' section");
    } else {
      this.validateErrors(c.response.errors);
    }
  }

  validateSuccess(success) {
    if (!isNum(success.http_status)) {
      this.err('response.success.http_status', "missing or non-numeric 'http_status'");
    } else if (success.http_status < 100 || success.http_status > 599) {
      this.err('response.success.http_status', `${success.http_status} is not a valid HTTP status code`);
    }

    if (!nonEmpty(success.description)) {
      this.err('response.success.description', "missing or empty 'description'");
    }

    // 204 No Content has no body
    if (success.http_status === 204) return;

    if (!isArr(success.fields) || success.fields.length === 0) {
      this.err('response.success.fields', "must be a non-empty array (or set http_status: 204 if no response body)");
      return;
    }

    success.fields.forEach((field, i) => {
      this.validateField(
        field,
        `response.success.fields[${i}]${field && field.name ? ` (${field.name})` : ''}`,
        false, // isInput = false
      );
    });
  }

  validateErrors(errors) {
    // auth_errors and system_errors are mandatory
    if (!isArr(errors.auth_errors) || errors.auth_errors.length === 0) {
      this.err('response.errors.auth_errors', "must be a non-empty array — every operation must document its auth error scenarios");
    } else {
      errors.auth_errors.forEach((e, i) => this.validateErrorEntry(e, `response.errors.auth_errors[${i}]`));
    }

    if (!isArr(errors.system_errors) || errors.system_errors.length === 0) {
      this.err('response.errors.system_errors', "must be a non-empty array — every operation must document its system error scenarios");
    } else {
      errors.system_errors.forEach((e, i) => this.validateErrorEntry(e, `response.errors.system_errors[${i}]`));
    }

    // validation_errors and business_errors are optional categories
    if (errors.validation_errors) {
      if (!isArr(errors.validation_errors)) {
        this.err('response.errors.validation_errors', "must be an array");
      } else {
        errors.validation_errors.forEach((e, i) => this.validateErrorEntry(e, `response.errors.validation_errors[${i}]`));
      }
    }
    if (errors.business_errors) {
      if (!isArr(errors.business_errors)) {
        this.err('response.errors.business_errors', "must be an array");
      } else {
        errors.business_errors.forEach((e, i) => this.validateErrorEntry(e, `response.errors.business_errors[${i}]`));
      }
    }
  }

  validateErrorEntry(entry, ctx) {
    if (!isObj(entry)) { this.err(ctx, "must be a mapping"); return; }

    if (!entry.code) {
      this.err(ctx, "missing 'code'");
    } else if (!isScreamingSnake(entry.code)) {
      this.err(ctx, `'code' must be SCREAMING_SNAKE_CASE, got "${entry.code}"`);
    }

    if (!isNum(entry.http_status)) {
      this.err(ctx, "missing or non-numeric 'http_status'");
    } else if (entry.http_status < 100 || entry.http_status > 599) {
      this.err(ctx, `http_status ${entry.http_status} is not a valid HTTP status code`);
    }

    if (this.hasGraphql && !nonEmpty(entry.graphql_extension_code)) {
      this.err(ctx, "missing or empty 'graphql_extension_code'");
    }
    if (!nonEmpty(entry.message)) {
      this.err(ctx, "missing or empty 'message'");
    }
    if (!nonEmpty(entry.description)) {
      this.err(ctx, "missing or empty 'description'");
    }
  }
}

// ── CLI entry point ────────────────────────────────────────────────────────────
function main() {
  const filesToValidate = findYmlFiles(CONTRACTS_DIR);

  if (filesToValidate.length === 0) {
    console.log('No .yml files found under contracts/');
    process.exit(0);
  }

  // Always load ALL operation contracts first for cross-file depends_on resolution
  const allContracts = {};
  for (const f of findYmlFiles(CONTRACTS_DIR)) {
    allContracts[f] = loadContract(f);
  }

  console.log(`\nValidating ${filesToValidate.length} contract file${filesToValidate.length !== 1 ? 's' : ''}...\n`);

  let passed = 0;
  let failed = 0;

  for (const filePath of filesToValidate) {
    const contract  = allContracts[filePath] || loadContract(filePath);
    const validator = new ContractValidator(filePath, contract, allContracts);
    const errors    = validator.validate();
    const relPath   = path.relative(ROOT, filePath);

    if (errors.length === 0) {
      console.log(`  ✓  ${relPath}`);
      passed++;
    } else {
      console.log(`  ✗  ${relPath}`);
      for (const e of errors) {
        console.log(`       ${e}`);
      }
      failed++;
    }
  }

  const total = passed + failed;
  console.log(`\nSummary: ${passed}/${total} passed${failed > 0 ? `, ${failed} failed` : ''}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
