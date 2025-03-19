import React, { useState } from 'react';
import './App.css';

function App() {
  const [catName, setCatName] = useState('');
  const [catImage, setCatImage] = useState(null);
  const [catTraits, setCatTraits] = useState('');
  const [chatActive, setChatActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');

  // LLM container
  const containerName = "ollama"
  const [command, setCommand] = useState(""); // Store command input
  const [output, setOutput] = useState(""); // Store output

  // Function to send command to backend
  const exec = async () => {
    try {
      const response = await fetch("http://localhost:5000/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ containerName, command }),
      });

      const data = await response.json();
      setOutput(data.output || "No response received");
    } catch (error) {
      console.error("Error executing command:", error);
      setOutput("Error executing command");
    }
  };

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
  const sendMessage = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    
    // Add user message to chat
    const newMessages = [...messages, { sender: 'user', text: userInput }];
    setMessages(newMessages);
    setUserInput('');

    // Interact with container
    const ollamaCommand = `ollama run llama3.2 &&`
    var prompt = `Context: This is a cat named ${catName}. They have the following traits: ${catTraits}. Generate a response as the cat to the following message: ${userInput}`;
    setCommand(ollamaCommand + prompt)
    
    // Wait for the state to update and then execute
    setTimeout(() => {
      exec();
    }, 500);
    
    // Generate cat response based on traits
    setTimeout(() => {
      let response = `Meow! `;

      response += output
      
      /*
      // Default responses if no matching traits
      if (!response.includes('ball') && !response.includes('treats') && !response.includes('nap')) {
        const defaultResponses = [
          'What are you up to?',
          'Can you pet me?',
          'I like sitting in boxes!',
          'Did you hear that noise?'
        ];
        response += defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
      }
      */
      
      setMessages([...newMessages, { sender: 'cat', text: response }]);
    }, 1000);
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
        <h1>Cat Chatbot</h1>
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
                  placeholder="e.g., Whiskers"
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
              />
              <button type="submit">Send</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;