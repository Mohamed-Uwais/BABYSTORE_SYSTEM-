-- Add simulator and web channels for chatbot testing
ALTER TABLE chatbot_conversations MODIFY COLUMN channel
  ENUM('whatsapp','instagram','messenger','simulator','web') NOT NULL;
