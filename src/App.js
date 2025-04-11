import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [catName, setCatName] = useState('');
  const [catImage, setCatImage] = useState(null);
  const [catTraits, setCatTraits] = useState('');
  const [chatActive, setChatActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Ref to store the current message container element
  const messagesContainerRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle image upload
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCatImage(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Start chat with cat
  const startChat = (e) => {
    e.preventDefault();
    if (!catName.trim()) {
      alert('Please give your cat a name!');
      return;
    }
    
    setChatActive(true);
    // Add initial message from cat
    setMessages([{
      sender: 'cat',
      text: `Meow! I'm ${catName}. Nice to meet you!`
    }]);
  };

  // Send message to cat with streaming response
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return; // Prevent multiple submissions
    
    // Set loading state to true
    setIsLoading(true);
    
    // Add user message to chat
    const newUserInput = userInput; // Store current input before clearing
    const newMessages = [...messages, { sender: 'user', text: newUserInput }];
    setMessages(newMessages);
    setUserInput('');

    try {
      // Add an empty cat message that will be updated as the stream comes in
      setMessages(prevMessages => [...prevMessages, { 
        sender: 'cat', 
        text: '',
        isStreaming: true // Mark this message as streaming
      }]);
      
      // Prepare the request data
      const model = `llama3.2`;
      const prompt = `Context: This is a cat named ${catName}. They have the following traits: ${catTraits}. Generate a response as the cat to the following message: ${newUserInput}`;
      
      var host = ("REACT_APP_LOCAL" in process.env) ? process.env.REACT_APP_LOCAL : "localhost";
      var port = ("REACT_APP_SERVER_PORT" in process.env) ? process.env.REACT_APP_SERVER_PORT : 5001;
      
      // Use fetch with streaming
      const response = await fetch(`http://${host}:${port}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Create a reader from the response body stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let done = false;
      let accumulatedResponse = '';
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (done) break;
        
        // Decode and process the chunk
        const chunk = decoder.decode(value, { stream: true });
        
        // SSE data comes in the format "data: {json}\n\n"
        const lines = chunk.split('\n\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.substring(6); // Remove 'data: ' prefix
              if (jsonStr.trim()) {
                const data = JSON.parse(jsonStr);
                
                if (data.error) {
                  // Handle error in stream
                  setMessages(prevMessages => {
                    const newMessages = [...prevMessages];
                    const lastIndex = newMessages.length - 1;
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      text: "Meow? Something went wrong with my cat brain...",
                      isStreaming: false
                    };
                    return newMessages;
                  });
                  done = true;
                  break;
                }
                
                if (data.response) {
                  accumulatedResponse += data.response;
                  
                  // Update the message being streamed
                  setMessages(prevMessages => {
                    const newMessages = [...prevMessages];
                    const lastIndex = newMessages.length - 1;
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      text: accumulatedResponse
                    };
                    return newMessages;
                  });
                }
                
                if (data.done) {
                  // Mark message as no longer streaming
                  setMessages(prevMessages => {
                    const newMessages = [...prevMessages];
                    const lastIndex = newMessages.length - 1;
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      isStreaming: false
                    };
                    return newMessages;
                  });
                  done = true;
                  break;
                }
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e, line);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error getting cat response:", error);
      setMessages(prevMessages => {
        const newMessages = [...prevMessages];
        const lastIndex = newMessages.length - 1;
        newMessages[lastIndex] = {
          ...newMessages[lastIndex],
          text: "Meow? Something went wrong with my cat brain...",
          isStreaming: false
        };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset chat and create new cat
  const resetChat = () => {
    setChatActive(false);
    setCatName('');
    setCatImage(null);
    setCatTraits('');
    setMessages([]);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>CatBot</h1>
        {chatActive && <button onClick={resetChat} className="reset-button">New Cat</button>}
      </header>

      <main className="app-main">
        {!chatActive ? (
          <div className="cat-creator">
            <h2>Create Your Cat Friend</h2>
            <form onSubmit={startChat}>
              <div className="form-group">
                <label htmlFor="cat-name">Cat Name:</label>
                <input
                  id="cat-name"
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g., Pebble"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="cat-image">Cat Photo:</label>
                <input
                  id="cat-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {catImage && (
                  <div className="image-preview">
                    <img src={catImage} alt="Cat preview" />
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="cat-traits">Cat Traits & Notes:</label>
                <textarea
                  id="cat-traits"
                  value={catTraits}
                  onChange={(e) => setCatTraits(e.target.value)}
                  placeholder="e.g., playful, hungry, sleepy, likes toys"
                  rows="4"
                />
              </div>
              
              <button type="submit" className="start-chat-button">
                Start Chatting
              </button>
            </form>
          </div>
        ) : (
          <div className="chat-container">
            <div className="chat-header">
              <div className="cat-profile">
                {catImage && <img src={catImage} alt={catName} className="cat-avatar" />}
                <div className="cat-info">
                  <h3>{catName}</h3>
                  {catTraits && <p className="cat-traits-display">{catTraits}</p>}
                </div>
              </div>
            </div>
            
            <div className="messages-container" ref={messagesContainerRef}>
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`message ${msg.sender === 'user' ? 'user-message' : 'cat-message'}`}
                >
                  {msg.text}
                  {msg.isStreaming && <span className="typing-indicator">•••</span>}
                </div>
              ))}
            </div>
            
            <form onSubmit={sendMessage} className="message-form">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Say something to your cat..."
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading}>
                {isLoading ? "Waiting..." : "Send"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;