// Spec 005 B29: what Pinebrook's sample customers ask. Answers paraphrase the real docs in
// content/pinebrook and cite the section they come from. Gaps are topics the docs leave out.

export interface CitedSection {
  slug: string;
  heading: string;
}

export interface AnsweredTopic {
  weight: number;
  wordings: string[];
  answer: string;
  cites: CitedSection[];
}

export interface GapTopic {
  key: string;
  weight: number;
  wordings: string[];
}

const returns = (heading: string): CitedSection => ({ slug: "returns-and-refunds", heading });
const shipping = (heading: string): CitedSection => ({ slug: "shipping-rates-and-delivery-times", heading });
const orders = (heading: string): CitedSection => ({ slug: "order-tracking-and-changes", heading });
const warranty = (heading: string): CitedSection => ({ slug: "product-warranty", heading });
const payments = (heading: string): CitedSection => ({ slug: "payment-methods", heading });

export const answeredTopics: AnsweredTopic[] = [
  {
    weight: 9,
    wordings: ["Can I return a kettle I've already used?", "Can I return a toaster I opened?", "I used my blender once, can I still return it?"],
    answer:
      "Yes. Small appliances can be returned within 30 days of delivery as long as they're undamaged. Because it's been used, a 10% restocking fee applies; unopened items in their original packaging have no fee. [1]",
    cites: [returns("Used and opened items")],
  },
  {
    weight: 10,
    wordings: ["What's your return policy?", "How long do I have to return something?", "Is it 30 days for returns?"],
    answer:
      "Most items can be returned within 30 days of delivery for a full refund to your original payment method. The 30 days start on the delivery date shown in tracking. [1]",
    cites: [returns("Return window")],
  },
  {
    weight: 8,
    wordings: ["How do I start a return?", "Do I get a prepaid return label?", "Where do I send my return?"],
    answer:
      "Email returns@pinebrook.example with your order number, which starts with PB. The team replies within one business day with instructions. US customers get a prepaid return label; customers in Canada and the UK pay for return shipping. [1]",
    cites: [returns("How to start a return")],
  },
  {
    weight: 8,
    wordings: ["When will I get my refund?", "How long do refunds take?", "I sent my return back last week, when do I get my money?"],
    answer:
      "Refunds are issued within 5 business days of Pinebrook receiving your return. Your bank may take a further 3 to 10 business days to show it. [1]",
    cites: [returns("Refund timing")],
  },
  {
    weight: 4,
    wordings: ["Can I exchange this for a different color?", "Do you do exchanges?"],
    answer: "Pinebrook doesn't do direct exchanges. To swap an item, return it for a refund and place a new order. [1]",
    cites: [returns("Exchanges")],
  },
  {
    weight: 3,
    wordings: ["Can I return a gift card?", "Can I send back the coffee beans I ordered?"],
    answer:
      "No. Gift cards, pantry and food items, knives that have been sharpened, and anything marked final sale can't be returned. [1]",
    cites: [returns("Items we can't take back")],
  },
  {
    weight: 9,
    wordings: ["How long does shipping to Canada take?", "How long will my order take to get to Toronto?"],
    answer:
      "Orders are dispatched within two business days of payment, then arrive in Canada in 5 to 8 business days. [1] [2]",
    cites: [shipping("Processing time"), shipping("Delivery times")],
  },
  {
    weight: 10,
    wordings: ["How much is shipping?", "Do you have free shipping?", "Is shipping free over a certain amount?"],
    answer:
      "Standard US shipping is $6.95 and free on orders over $75; express is $18. Canada is a flat $14.95, free over $150, and the UK is a flat $24. [1]",
    cites: [shipping("Shipping rates")],
  },
  {
    weight: 5,
    wordings: ["How fast is express shipping?", "What's the quickest delivery option?"],
    answer:
      "Express shipping within the US takes 1 to 2 business days after dispatch and costs $18. Orders are dispatched within two business days of payment. [1] [2]",
    cites: [shipping("Delivery times"), shipping("Shipping rates")],
  },
  {
    weight: 5,
    wordings: ["Do you ship to the UK?", "How long does delivery to London take?"],
    answer:
      "Yes. Orders to the United Kingdom arrive in 7 to 10 business days after dispatch. The carrier may charge import duties or taxes on delivery, and those are paid by the customer. [1] [2]",
    cites: [shipping("Delivery times"), shipping("Customs and import duties")],
  },
  {
    weight: 4,
    wordings: ["Will I pay customs fees in Canada?", "Are import duties included in the price?"],
    answer:
      "Orders to Canada and the UK may be charged import duties or taxes by the carrier on delivery. They're set by the destination country and paid by the customer. [1]",
    cites: [shipping("Customs and import duties")],
  },
  {
    weight: 4,
    wordings: ["Do you ship to Australia?", "Can you deliver to Germany?"],
    answer:
      "Not yet. Pinebrook ships to the United States, Canada and the United Kingdom only, and can't deliver to freight forwarders. [1]",
    cites: [shipping("Where we ship")],
  },
  {
    weight: 10,
    wordings: ["Where is my order?", "How do I track my order?", "My tracking link shows nothing yet"],
    answer:
      "Sign in to your Pinebrook account and open Orders, or use the tracking link in your dispatch email. Tracking can take up to 24 hours to show the first scan. [1] [2]",
    cites: [orders("Finding your order status"), shipping("Tracking your shipment")],
  },
  {
    weight: 6,
    wordings: ["Can I change my shipping address?", "I need to add something to my order"],
    answer:
      "Within one hour of placing your order, email orders@pinebrook.example to change the items or the shipping address. After an hour the order is being packed and can't be changed. [1]",
    cites: [orders("Changing an order")],
  },
  {
    weight: 5,
    wordings: ["How do I cancel my order?", "Can I still cancel an order I placed this morning?"],
    answer:
      "You can cancel within one hour of placing the order for a full refund. After that it can't be cancelled, but you can return it under the returns policy once it arrives. [1]",
    cites: [orders("Cancelling an order")],
  },
  {
    weight: 4,
    wordings: ["My package says delivered but it isn't here", "Tracking says delivered but I can't find it"],
    answer:
      "Wait one business day, since carriers sometimes mark packages early. If it still hasn't arrived, email orders@pinebrook.example and Pinebrook will open a claim with the carrier. [1]",
    cites: [orders("Late or missing packages")],
  },
  {
    weight: 4,
    wordings: ["My mug arrived broken", "The box came crushed and the pan is dented, what do I do?"],
    answer:
      "Email photos of the item and the box to orders@pinebrook.example within 7 days of delivery. Pinebrook ships a replacement at no cost, and you don't need to send the damaged item back. [1]",
    cites: [orders("Damaged on arrival")],
  },
  {
    weight: 6,
    wordings: ["How long is the warranty?", "Is my blender under warranty?"],
    answer:
      "Small appliances and cookware have a 2-year limited warranty from the delivery date. It covers defects in materials and workmanship under normal home use. [1]",
    cites: [warranty("What the warranty covers")],
  },
  {
    weight: 5,
    wordings: ["My toaster stopped working after 6 months", "How do I make a warranty claim?"],
    answer:
      "Email warranty@pinebrook.example with your order number, a short description of the problem and a photo or video that shows it. They reply within two business days; an approved claim is repaired or replaced, with the replacement shipped free. [1] [2]",
    cites: [warranty("How to make a warranty claim"), warranty("Repair, replacement or refund")],
  },
  {
    weight: 2,
    wordings: ["Does the warranty cover scratches on my pan?"],
    answer:
      "No. The warranty doesn't cover normal wear and tear, scratches or discoloration from use, or damage from drops or misuse. [1]",
    cites: [warranty("What the warranty doesn't cover")],
  },
  {
    weight: 2,
    wordings: ["My kettle broke after two weeks, is that a return or a warranty claim?"],
    answer: "In the first 30 days after delivery, use the returns process. After 30 days, faulty items are handled under the warranty. [1]",
    cites: [warranty("Warranty or return")],
  },
  {
    weight: 7,
    wordings: ["Do you accept PayPal?", "Can I pay with Apple Pay?", "What payment methods do you take?"],
    answer:
      "Yes. Pinebrook accepts Visa, Mastercard, American Express, Discover, PayPal, Apple Pay, Google Pay and Pinebrook gift cards. [1]",
    cites: [payments("Accepted payment methods")],
  },
  {
    weight: 3,
    wordings: ["When will my card be charged?", "Why do I see a pending charge already?"],
    answer:
      "Your card is authorized when you place the order and charged when it's dispatched. If part of an order ships later, you're only charged for what has shipped. [1]",
    cites: [payments("When you're charged")],
  },
  {
    weight: 3,
    wordings: ["Can I pay in Canadian dollars?", "Do you charge in pounds for UK orders?"],
    answer: "All prices are in US dollars, including for customers in Canada and the UK; your bank converts the amount at its own rate. [1]",
    cites: [payments("Currency")],
  },
  {
    weight: 3,
    wordings: ["Do gift cards expire?", "I lost my gift card, can you replace it?"],
    answer:
      "Pinebrook gift cards never expire and can be used on any order. A lost gift card can only be replaced if you have the purchase receipt. [1]",
    cites: [payments("Gift cards")],
  },
];

// Topics the docs don't cover, worded the ways customers actually ask.
export const gapTopics: GapTopic[] = [
  { key: "price-match", weight: 6, wordings: ["Do you price match?", "Will you match a lower price from another store?", "do you price match??"] },
  { key: "student-discount", weight: 5, wordings: ["Do you offer a student discount?", "Is there a discount for students?"] },
  { key: "installments", weight: 5, wordings: ["Can I pay in installments?", "Do you offer Klarna or Afterpay?", "Can I split my payment into 4?"] },
  { key: "promo-code", weight: 4, wordings: ["Do you have a promo code?", "Is there a discount code for my first order?"] },
  { key: "gift-wrap", weight: 3, wordings: ["Do you offer gift wrapping?", "Can you gift wrap my order?"] },
  { key: "phone", weight: 3, wordings: ["What's your phone number?", "Can I call someone about my order?"] },
  { key: "store-pickup", weight: 2, wordings: ["Do you have a physical store?", "Can I pick up my order in person?"] },
  { key: "replacement-parts", weight: 2, wordings: ["Can I buy a replacement lid for my kettle?"] },
  { key: "loyalty", weight: 2, wordings: ["Do you have a rewards program?", "Do I earn points on purchases?"] },
  { key: "wholesale", weight: 1, wordings: ["Do you offer bulk or wholesale pricing?"] },
];

// "Doc written" examples: one still quiet, one asked again after it was marked.
export const resolvedGaps: { key: string; askedAgain: boolean }[] = [
  { key: "gift-wrap", askedAgain: false },
  { key: "loyalty", askedAgain: true },
];

export const sampleCustomers = [
  "maya.chen@example.com",
  "jordan.r@example.com",
  "priya.patel@example.com",
  "tom.okafor@example.com",
  "elena.garcia@example.com",
  "sam.whitfield@example.com",
  "lucas.martin@example.com",
  "aisha.khan@example.com",
  "ben.harlow@example.com",
  "nora.lindqvist@example.com",
];

export const sampleNotes = [
  "Replied by email: we don't price match, but pointed them to free shipping over $75.",
  "Sent the returns address and the PB order number format. Customer confirmed.",
  "Customer asked about Klarna. Flagged for the payments doc, nothing to offer yet.",
  "There's no phone line, so answered their order question by email within the hour.",
  "Duplicate of an earlier email thread, closed here.",
  "Asked for a student discount. Replied that we don't offer one right now.",
];
