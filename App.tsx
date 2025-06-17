import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, SenderType } from './types';
import { ChatMessage } from './components/ChatMessage';
import { UserInput } from './components/UserInput';
import { LoadingIcon } from './components/LoadingIcon';
import { BotIcon } from './components/icons/BotIcon';
import { geminiService } from './services/geminiService';
import { SYSTEM_INSTRUCTION, INITIAL_BOT_MESSAGE } from './constants';
// Không còn cần: import type { Chat } from '@google/genai';


const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // chatRef không còn cần thiết vì client không quản lý session Gemini trực tiếp
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // apiKeyExists và các kiểm tra liên quan ở client được loại bỏ

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Khởi tạo với tin nhắn bot đầu tiên
    setMessages([{
      id: Date.now().toString(),
      text: INITIAL_BOT_MESSAGE,
      sender: SenderType.AI,
      timestamp: new Date()
    }]);
    // Không cần khởi tạo chat bất đồng bộ ở đây nữa
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendMessage = useCallback(async (inputText: string) => {
    if (!inputText.trim() || isLoading) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: SenderType.User,
      timestamp: new Date()
    };
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setIsLoading(true); // Vô hiệu hóa input
    setError(null);

    const aiMessageId = (Date.now() + 1).toString();
    // Thêm một placeholder cho tin nhắn AI để cập nhật dần
    setMessages(prevMessages => [...prevMessages, {
      id: aiMessageId,
      text: "",
      sender: SenderType.AI,
      timestamp: new Date(),
      isLoading: true, // Tin nhắn AI này đang tải
    }]);

    let fullResponse = "";
    try {
      // Sử dụng SYSTEM_INSTRUCTION từ constants.ts
      // geminiService.sendMessageStream giờ đây chỉ cần systemInstruction và inputText
      const stream = geminiService.sendMessageStream(SYSTEM_INSTRUCTION, inputText);

      for await (const chunkText of stream) { // chunkText giờ là một string
        fullResponse += chunkText;
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === aiMessageId ? { ...msg, text: fullResponse, isLoading: false } : msg
          )
        );
      }
      // Cập nhật cuối cùng để đảm bảo isLoading là false sau khi stream kết thúc
       setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === aiMessageId ? { ...msg, text: fullResponse, isLoading: false } : msg
          )
        );

    } catch (e) {
      console.error("Lỗi khi stream tin nhắn:", e);
      const errorMessage = e instanceof Error ? e.message : "Đã xảy ra lỗi không xác định.";
      // Cập nhật tin nhắn AI với thông báo lỗi
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === aiMessageId ? { ...msg, text: `Lỗi: ${errorMessage}. Vui lòng thử lại.`, isLoading: false, sender: SenderType.AI } : msg
        )
      );
      // Hiển thị lỗi chung ở dưới ô input
      setError(`Không thể nhận phản hồi: ${errorMessage}`);
    } finally {
      setIsLoading(false); // Kích hoạt lại input
    }
  }, [isLoading]); // Phụ thuộc vào isLoading để tránh gọi lại khi đang xử lý


  // Phần UI kiểm tra API key đã được loại bỏ.
  // Nếu có vấn đề với API key, hàm serverless sẽ báo lỗi,
  // và handleSendMessage sẽ bắt lỗi từ geminiService.

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto bg-gray-800 shadow-2xl rounded-lg overflow-hidden">
      <header className="bg-gray-900 p-4 sm:p-6 text-white flex items-center space-x-3 shadow-lg">
        <BotIcon className="h-10 w-10 text-cyan-400" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Huấn luyện viên Khởi nghiệp Thần Tốc</h1>
          <p className="text-xs sm:text-sm text-cyan-300">AI dẫn dắt bạn đến thành công MVP</p>
        </div>
      </header>
      
      <div className="flex-grow p-4 sm:p-6 space-y-4 overflow-y-auto bg-gray-800">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {/* Component ChatMessage đã tự xử lý trạng thái loading của riêng nó */}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="p-3 bg-red-700 text-white text-sm text-center">
          {error}
        </div>
      )}

      <UserInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default App;