const NEW_CUSTOMER = [
  "Hey there! 👋 Welcome to Littora! I'm Liya — what can I help you with?",
  "Hi! 😊 Welcome to Littora! Looking for diapers or wipes?",
  "Hey! 👋 I'm Liya from Littora. What do you need today?",
  "Hello! 😊 Welcome to LITTORA! How can I help?",
];

const RETURNING_CUSTOMER = [
  (name, product) => `Hey ${name}! 👋 Welcome back! Need more ${product}?`,
  (name) => `Hi ${name}! 😊 Good to see you again! How can I help?`,
  (name) => `Hey! 👋 ${name}, ready for another order?`,
  (name) => `Welcome back ${name}! 😊 What can I get you today?`,
];

const THANKS_RESPONSES = [
  "You're welcome! 😊 Let me know if you need anything else!",
  "Happy to help! 👋 Come back anytime!",
  "No problem at all! 😊 Have a great day!",
  "Anytime! 👋 Take care!",
];

const GOODBYE_RESPONSES = [
  "Bye! 👋 Take care and see you soon!",
  "See you next time! 😊 Happy parenting!",
  "Bye bye! 👋 Don't hesitate to message if you need anything!",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = { NEW_CUSTOMER, RETURNING_CUSTOMER, THANKS_RESPONSES, GOODBYE_RESPONSES, pick };
