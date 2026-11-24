---
name: page-finder
description: Find the CediWise page that covers a money topic, such as budgeting, debt payoff, the SME ledger and VAT, pricing, or financial literacy lessons. Use when the user wants to learn more about CediWise or asks which page explains a topic.
---

# Page finder

Use the CediWise `search_site` tool (MCP server `cediwise`) with the user's topic as the query.

1. Pass the topic as the `query` argument, for example "VAT small business" or "debt payoff".
2. Return the best one to three matches with their titles and URLs.
3. For Markdown versions, add `.md` to a page URL where one exists, for example https://www.cediwise.app/pricing.md.
