# AI Studio

A powerful full-stack application that enables intelligent document processing, video/audio analysis, and AI-powered conversations using local LLM models via Ollama.

## 🌟 Features

### Document Processing
- **Multi-format Support**: Process PDFs, Word documents (DOC/DOCX), PowerPoint presentations (PPT/PPTX), text files, and more
- **Text Extraction**: Automatically extract and analyze text content from various document formats
- **Document Chunking**: Smart text chunking for better navigation and context management
- **Search Functionality**: Search within uploaded documents with highlighted results

### Media Analysis
- **Video Processing**: Upload and analyze video files (MP4, MOV, AVI, MKV, WebM, etc.)
- **Audio Transcription**: Extract and transcribe audio from videos or standalone audio files
- **Frame Extraction**: Automatically extract key frames from videos for visual analysis
- **Vision AI**: Analyze video frames using LLaVA vision models

### Image Processing
- **OCR Support**: Extract text from images using Tesseract.js
- **Multiple Formats**: Support for JPG, PNG, GIF, BMP, WebP, SVG, and TIFF
- **Visual Analysis**: AI-powered image description and analysis

### AI Chat Interface
- **Local LLM Integration**: Connect to Ollama for private, local AI processing
- **Model Selection**: Choose from available Ollama models
- **Context-Aware**: Maintain conversation context with document references
- **Streaming Responses**: Real-time streaming of AI responses
- **Custom System Prompts**: Configure AI behavior with custom system prompts
- **Evaluation Checklists**: Optional checklist-based response validation

### Export & Download
- **Chat History Export**: Save conversations as text or DOCX files
- **Analysis Reports**: Generate formatted Word documents from AI analysis
- **Audio Export**: Download extracted audio from video files
- **Multiple Formats**: Export content as TXT, JSON, CSV, HTML, or DOCX

## 🏗️ Architecture

### Backend (Node.js/Express)
- **Port**: 3002
- **File Upload**: Multer for handling multipart/form-data
- **Document Processing**: 
  - PDF extraction with pdf.js-extract
  - Word document processing with Mammoth and OfficeParser
  - Image OCR with Tesseract.js
- **Media Processing**:
  - Video frame extraction with FFmpeg
  - Audio extraction and conversion
- **AI Integration**: Axios client for Ollama API communication

### Frontend (React)
- **Port**: 4000 (configurable via .env)
- **UI Framework**: Material-UI (MUI) v7
- **Styling**: Custom theme with pink/cream color scheme
- **State Management**: React Hooks (useState, useEffect, useRef)
- **Markdown Support**: React-Markdown for formatted responses

## 📋 Prerequisites

- **Node.js**: v14 or higher
- **npm**: v6 or higher
- **Ollama**: Installed and running locally
  - Download from [ollama.ai](https://ollama.ai)
  - Default endpoint: `http://127.0.0.1:11434/api`
- **FFmpeg**: Required for video processing
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt-get install ffmpeg`
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org)

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/ai-studio.git
cd ai-studio
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 4. Configure Environment Variables

**Frontend** (`frontend/.env`):
```env
PORT=4000
```

**Backend**: No additional configuration required (uses port 3002 by default)

## 🎯 Usage

### Start the Application

#### Terminal 1 - Backend Server
```bash
cd backend
npm start
```
The backend server will start on `http://localhost:3002`

#### Terminal 2 - Frontend Application
```bash
cd frontend
npm start
```
The frontend will start on `http://localhost:4000` (or the port specified in .env)

### Using the Application

1. **Select an AI Model**: Choose from available Ollama models in the dropdown
2. **Upload Documents**: Click the upload button to add documents, images, videos, or audio files
3. **Chat with AI**: Type your questions and get AI-powered responses
4. **Analyze Media**: Upload videos for automatic transcription and frame analysis
5. **Export Results**: Download chat history, analysis reports, or extracted audio

## 📁 Project Structure

```
ai-studio/
├── backend/
│   ├── server.js              # Main Express server
│   ├── package.json           # Backend dependencies
│   ├── uploads/               # Uploaded files storage
│   ├── downloads/             # Generated files for download
│   ├── temp_frames/           # Temporary video frames
│   └── models/                # AI model storage
├── frontend/
│   ├── src/
│   │   ├── App.js            # Main React component
│   │   ├── fileUtils.js      # File utility functions
│   │   ├── index.js          # React entry point
│   │   └── App.css           # Styles
│   ├── public/               # Static assets
│   ├── package.json          # Frontend dependencies
│   └── .env                  # Environment configuration
└── README.md                 # This file
```

## 🔧 API Endpoints

### Document Management
- `POST /api/upload` - Upload and process documents
- `POST /api/upload-image` - Upload and process images
- `POST /api/upload-video` - Upload and process videos
- `POST /api/upload-audio` - Upload and process audio files
- `GET /api/documents/:id` - Get document details
- `DELETE /api/documents/:id` - Delete a document

### AI Interaction
- `POST /api/chat` - Send chat messages to AI
- `GET /api/models` - List available Ollama models
- `POST /api/search` - Search within documents

### Export & Download
- `POST /api/export/chat` - Export chat history
- `POST /api/generate/file` - Generate downloadable file
- `GET /api/download/:filename` - Download generated file
- `POST /api/export-analysis` - Export analysis as DOCX
- `GET /api/export-audio/:documentId` - Export extracted audio

## 🛠️ Technologies Used

### Backend
- **Express.js** - Web framework
- **Multer** - File upload handling
- **Mammoth** - Word document processing
- **pdf.js-extract** - PDF text extraction
- **OfficeParser** - Office document parsing
- **Tesseract.js** - OCR for images
- **FFmpeg** - Video/audio processing
- **Sharp** - Image processing
- **Docx** - Word document generation
- **Axios** - HTTP client for Ollama API

### Frontend
- **React 19** - UI framework
- **Material-UI (MUI) v7** - Component library
- **React-Markdown** - Markdown rendering
- **Axios** - HTTP client

## 🎨 Customization

### Theme Colors
The application uses a custom pink and cream color scheme. To modify:

Edit `frontend/src/App.js`:
```javascript
const theme = createTheme({
  palette: {
    primary: {
      main: '#E91E63', // Deep pink
    },
    background: {
      default: '#D4B896', // Warm cream/beige
    },
    // ... other colors
  },
});
```

### System Prompt
Customize the AI's behavior by modifying the default system prompt in `frontend/src/App.js`:
```javascript
const [systemPrompt, setSystemPrompt] = useState("Your custom prompt here");
```

## 🐛 Troubleshooting

### Ollama Connection Issues
- Ensure Ollama is running: `ollama serve`
- Check if models are installed: `ollama list`
- Pull a model if needed: `ollama pull llama3.2`

### FFmpeg Not Found
- Install FFmpeg using your system's package manager
- Verify installation: `ffmpeg -version`

### Port Already in Use
- Change the backend port in `backend/server.js`
- Change the frontend port in `frontend/.env`

### File Upload Errors
- Check file size limits (default: 50MB)
- Ensure upload directories exist and have write permissions

## 📝 License

ISC

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.

## 🔮 Future Enhancements

- [ ] Multi-language support
- [ ] Cloud storage integration
- [ ] Batch document processing
- [ ] Advanced video editing features
- [ ] Real-time collaboration
- [ ] Mobile responsive design improvements
- [ ] Docker containerization
- [ ] User authentication and sessions

## ⚠️ Important Notes

- This application processes files locally and requires Ollama for AI functionality
- Large video files may take significant time to process
- Ensure adequate disk space for uploads and temporary files
- The application is designed for local/private use with local LLM models

---

**Built with ❤️ for intelligent document and media processing**