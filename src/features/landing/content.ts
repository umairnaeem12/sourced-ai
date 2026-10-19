// Every line here must stay true of the shipped demo; the Upwork listing quotes it.

export const navLinks = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#compare", label: "Compare" },
  { href: "#faq", label: "FAQ" },
];

export const heroPoints = [
  "Cites every answer",
  "Says when it doesn’t know",
  "Hands off to your team",
];

export const chatScript = {
  docs: ["Shipping", "Returns", "Warranty", "Orders", "Payments"],
  first: {
    question: "Can I return a kettle I’ve already used?",
    hit: "Returns",
    passage: {
      source: "Returns and refunds §2",
      before: "Small appliances can be returned within 30 days of delivery. ",
      highlight: "Used items are accepted if undamaged, minus a 10% restocking fee.",
    },
    answer:
      "Yes. You can return it within 30 days of delivery as long as it isn’t damaged. Since it’s been used, a 10% restocking fee comes off the refund.",
    source: "Returns and refunds, section 2",
  },
  second: {
    question: "Do you price match?",
    answer:
      "I couldn’t find anything about price matching in Pinebrook’s policies, so I won’t guess. I can bring in someone from the team.",
    handoff: "Sent to #support-handoff and added to the gap report",
  },
};

export const pipeline = [
  {
    title: "Your docs go in",
    body: "Help pages, shipping and returns policies, product FAQs. Whatever your support team already answers from.",
  },
  {
    title: "Split into passages",
    body: "Each doc is cut into short passages and indexed by meaning, so a question finds the right paragraph even in different words.",
  },
  {
    title: "Matched to the question",
    body: "Every question is scored against your passages. Only close matches go forward; weak ones are dropped.",
  },
  {
    title: "Answered with sources",
    body: "The AI writes the reply from those passages alone and links each one. No close match means no answer, and a person is offered.",
  },
];

export const pipelineQuestion = "Can I return a used kettle?";

export const pipelineMatches = [
  { label: "Returns §2", score: 0.91, used: true },
  { label: "Returns §1", score: 0.82, used: true },
  { label: "Warranty §1", score: 0.36, used: false },
];

export const features = [
  {
    title: "Answers with sources",
    body: "Every answer links the passage it came from, so a customer or your team can check it in one click.",
  },
  {
    title: "Says “I don’t know”",
    body: "When your docs don’t cover a question, it says so plainly and offers to bring in a person.",
  },
  {
    title: "Human handoff",
    body: "A customer can ask for a person at any point. Your team gets the conversation in Slack, by email, or in any tool through a webhook.",
  },
  {
    title: "Gap report",
    body: "Questions it couldn’t answer collect in one list, so you know which doc to write next.",
  },
  {
    title: "Pick your AI provider",
    body: "Gemini, OpenAI or Claude, chosen with one setting. Your docs and setup stay the same when you switch.",
  },
];

export const providers = ["Gemini", "OpenAI", "Claude"];

export const handoffMock = {
  channel: "support-handoff",
  time: "2:14 PM",
  headline: "A customer on Pinebrook Supply asked for a person",
  transcript: [
    { from: "Customer", text: "Do you price match?" },
    {
      from: "Sourced AI",
      text: "I couldn’t find anything about price matching in Pinebrook’s policies, so I won’t guess.",
    },
    { from: "Customer", text: "Yes please, can someone check?" },
  ],
  matched: "No matching docs",
};

export const gapReport = [
  { question: "Do you price match?", count: 14 },
  { question: "Can I change the address after it ships?", count: 9 },
  { question: "Do you ship to Australia?", count: 6 },
  { question: "Is there a student discount?", count: 4 },
];

export const comparison = [
  {
    capability: "Answers with sources",
    generic: "Answers from whatever the model picked up in training, with no source",
    sourced: "Answers from your docs and links the passage it used",
  },
  {
    capability: "Says “I don’t know”",
    generic: "Tends to guess when it’s unsure",
    sourced: "Says it doesn’t know and offers a person",
  },
  {
    capability: "Human handoff",
    generic: "Customer hunts for a contact form",
    sourced: "One click; your team gets the chat in Slack, email or their own tools",
  },
  {
    capability: "Gap report",
    generic: "No record of what it couldn’t answer",
    sourced: "Lists unanswered questions so you know what to write",
  },
  {
    capability: "AI provider",
    generic: "Tied to one vendor",
    sourced: "Gemini, OpenAI or Claude, switched by one setting",
  },
];

export const demoStore = {
  name: "Pinebrook Supply",
  description:
    "A fictional online store selling home and kitchen goods. Its policies, products and order numbers are all made up for this demo.",
  docs: [
    "Shipping rates and delivery times",
    "Returns and refunds",
    "Product warranty",
    "Order tracking and changes",
    "Payment methods",
  ],
  questions: [
    "Can I return a kettle I’ve already used?",
    "How long does shipping to Canada take?",
    "Do you price match?",
  ],
  gapNote:
    "The last question isn’t covered by Pinebrook’s docs, so it shows how Sourced AI handles a gap.",
};

export const faqs = [
  {
    question: "Where do the answers come from?",
    answer:
      "Only from the docs you add. Each question is matched to the closest passages in those docs, and the AI is instructed to answer from those passages alone and to cite them.",
  },
  {
    question: "Can it still get something wrong?",
    answer:
      "Any AI can. That’s why every answer shows its source: a customer or your team can check the exact passage in one click. When no passage is a close match, it says it doesn’t know.",
  },
  {
    question: "What happens when it hands off?",
    answer:
      "The customer is told the team has their conversation. Your team gets it wherever they work: a Slack message, an email they can reply to, or a webhook into any other tool. Every handoff also waits in the admin inbox.",
  },
  {
    question: "Which AI does it use?",
    answer:
      "Gemini by default. OpenAI or Claude can be switched in with one setting, without touching your docs or setup.",
  },
  {
    question: "What can I add as docs?",
    answer:
      "Written pages your support team already relies on: help-center articles, shipping and returns policies, warranty terms, product FAQs. The demo store uses five of them.",
  },
  {
    question: "How do I see it working?",
    answer:
      "Open the live demo. The Pinebrook Supply store is loaded with five sample docs: try the suggested questions or ask your own, then open a source to read the passage behind the answer.",
  },
];
