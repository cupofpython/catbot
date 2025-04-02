import React, { useState } from 'react';
import './App.css';

function App() {
  const [catName, setCatName] = useState('');
  const [catImage, setCatImage] = useState(null);
  const [catTraits, setCatTraits] = useState('');
  const [chatActive, setChatActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  // Send message to cat
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
      // Interact with LLM
      const model = `llama3.2`;
      const prompt = `Context: This is a cat named ${catName}. They have the following traits: ${catTraits}. Generate a response as the cat to the following message: ${newUserInput}`;
      
      // Execute command and wait for the result
      // Switch K8s service name to 0.0.0.0 for local testing!
      const result = await fetch("http://a4c423481a99842669d9088bba7450ad-1853516926.us-east-2.elb.amazonaws.com:5001/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          model,
          prompt
        }),
      });
      
      const data = await result.json();
      const response = data.response || "No response received";
      
      // Add cat response to messages
      setMessages(prevMessages => [...prevMessages, { sender: 'cat', text: response }]);
    } catch (error) {
      console.error("Error getting cat response:", error);
      // Show error response
      setMessages(prevMessages => [...prevMessages, { 
        sender: 'cat', 
        text: "Meow? Something went wrong with my cat brain..." 
      }]);
    } finally {
      // Always reset loading state
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
            
            <div className="messages-container">
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`message ${msg.sender === 'user' ? 'user-message' : 'cat-message'}`}
                >
                  {msg.text}
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