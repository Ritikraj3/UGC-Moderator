# §6 Images

> Source: HLD §6.

`posts.featured_image`, `comments.attachment_url` and `comments.image` are URLs — the image is uploaded first,
then referenced by the post.

**The image is checked with the post, not at upload.** One submission carries the text and the image URL, so there
is a single call site and a single contract.

**Why it matters:** the model reads text inside the picture. A phone number in a screenshot, a rival's poster, a
fee list as an image — all caught by the same rules, and all invisible to any blocked-word list.

**What it costs is no longer the learner's wait.** An image adds 1–2 seconds to the check, which under review first
means the post appears a second or two later, and under publish first means nothing at all.

*In the contract ([§10](10-contract.md)) the image travels as `image_url` — "An already-uploaded image. Optional.
One of body or image required".*
