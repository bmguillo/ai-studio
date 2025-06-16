import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  IconButton,
  Chip,
  List,
  ListItem,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Snackbar,
  Alert,
  Tooltip,
  Card,
  CardContent,
  Tabs,
  Tab,
  Pagination,
  InputAdornment,
  Badge,
  ThemeProvider,
  createTheme,
  Grid
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SaveIcon from "@mui/icons-material/Save";
import SearchIcon from "@mui/icons-material/Search";
import ArticleIcon from "@mui/icons-material/Article";
import DescriptionIcon from "@mui/icons-material/Description";
import SummarizeIcon from "@mui/icons-material/Summarize";
import FilterListIcon from "@mui/icons-material/FilterList";
import ImageIcon from "@mui/icons-material/Image";
import VideoFileIcon from "@mui/icons-material/VideoFile";
import AudioFileIcon from "@mui/icons-material/AudioFile";
import ReactMarkdown from "react-markdown";
import axios from "axios";
import {
  detectContentFormat,
  formatContent,
  suggestFilename,
} from "./fileUtils";

const API_URL = "http://localhost:3002/api";

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#E91E63', // Deep pink
      light: '#F8BBD9', // Light pink
      dark: '#AD1457', // Dark pink
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FF69B4', // Hot pink
      light: '#FFB3E6', // Very light pink
      dark: '#C2185B', // Darker pink
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#D4B896', // Much darker warm cream/beige
      paper: '#F5F5F5', // Slightly off-white for contrast
    },
    text: {
      primary: '#2D2D2D',
      secondary: '#666666',
    },
    error: {
      main: '#F44336',
    },
    warning: {
      main: '#FF9800',
    },
    info: {
      main: '#2196F3',
    },
    success: {
      main: '#4CAF50',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      background: 'linear-gradient(45deg, #E91E63 30%, #FF69B4 90%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 500,
        },
        contained: {
          background: 'linear-gradient(45deg, #E91E63 30%, #FF69B4 90%)',
          boxShadow: '0 3px 5px 2px rgba(233, 30, 99, .3)',
          '&:hover': {
            background: 'linear-gradient(45deg, #AD1457 30%, #C2185B 90%)',
          },
        },
        outlined: {
          borderColor: '#E91E63',
          borderWidth: '2px',
          color: '#E91E63',
          '&:hover': {
            borderColor: '#E91E63',
            borderWidth: '2px',
            backgroundColor: 'rgba(233, 30, 99, 0.04)',
          },
          '&.Mui-focused': {
            borderColor: '#E91E63',
            borderWidth: '2px',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(233, 30, 99, 0.1)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 20,
        },
        filled: {
          background: 'linear-gradient(45deg, #E91E63 30%, #FF69B4 90%)',
          color: 'white',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#E91E63',
              borderWidth: '2px',
            },
            '&:hover fieldset': {
              borderColor: '#E91E63',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#E91E63',
            },
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#E91E63',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#E91E63',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(233, 30, 99, 0.04)',
          },
        },
      },
    },
  },
});

function App() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(`You are an AI assistant that provides thorough, accurate responses. Before answering any question:

1. Ask the user if they want you to create evaluation checklists for all your responses (ask this only once at the start)
2. If yes, create a checklist of all aspects that need to be addressed before providing your answer
3. Use this checklist to ensure your response covers all necessary points
4. At the end of your response, show the completed checklist with Yes/No for each item
5. Only provide information you can verify and include references when possible

Provide comprehensive, well-structured responses that fully address the user's questions.`);
  const [documents, setDocuments] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [documentMode, setDocumentMode] = useState("auto");
  const [documentTab, setDocumentTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedChunks, setSelectedChunks] = useState([]);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [currentChunkContent, setCurrentChunkContent] = useState("");
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [fileGenDialogOpen, setFileGenDialogOpen] = useState(false);
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("txt");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [processSteps, setProcessSteps] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setSystemPrompt("You are to ask whether I want you to create a checklist for all prompts. If I say no, you are to proceed without doing so. If I say yes, upon entering a prompt, you are to make an evaluation checklist specific to that prompt and do so before answering the question. Then, after coming up with your answer, you are to independently use the checklist to verify that each aspect of my question has been answered by you. The checklist must consist solely of Yes or No items only. The checklist should be relevant and sensible, so be careful what you include. Be succinct but also comprehensive. Make sure to show me the completed and confirmed checklist at the end of the answer to the question posed in the prompt. You are not to provide a response as a fact for any items for which you do not have a verifiable reference.");
  }, []);

  // Fetch available models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        startProcessing("Connecting to Ollama API...");
        const response = await axios.get(`${API_URL}/models`);
        
        if (response.data && response.data.models) {
          addProcessStep("Successfully connected to Ollama API");
          addProcessStep("Loading available AI models...");
          
          const sttModels = [
            { name: "whisper-tiny (Local STT)", type: "stt" },
            { name: "whisper-base (Local STT)", type: "stt" }
          ];
          const allModels = [
            ...response.data.models.map(model => ({ ...model, type: "ollama" })),
            ...sttModels
          ];
          setModels(allModels);
          
          if (allModels.length > 0) {
            setSelectedModel(allModels[0].name);
            addProcessStep(`Found ${allModels.length} models available`);
          }
          
          // Clear steps after a short delay
          setTimeout(() => {
            clearProcessSteps();
          }, 2000);
        }
      } catch (error) {
        console.error("Error fetching models:", error);
        clearProcessSteps();
        showSnackbar(
          "Failed to load models. Please ensure Ollama is running.",
          "error"
        );
      }
    };

    fetchModels();
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch chunk content when current chunk changes
  useEffect(() => {
    if (activeDocument && currentChunk >= 0 && activeDocument.totalChunks > 0) {
      const fetchChunk = async () => {
        const chunkData = await handleFetchDocumentChunk(
          activeDocument.id,
          currentChunk
        );
        if (chunkData) {
          setCurrentChunkContent(chunkData.content);
        }
      };

      fetchChunk();
    }
  }, [activeDocument, currentChunk]);

  const handleModelChange = (event) => {
    setSelectedModel(event.target.value);
  };

  const handleDocumentTabChange = (event, newValue) => {
    setDocumentTab(newValue);
    // Reset search when changing tabs
    if (newValue !== 2) {
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const handleDocumentModeChange = (event) => {
    setDocumentMode(event.target.value);
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const addProcessStep = (step) => {
    setProcessSteps(prev => [...prev, `✓ ${step}`]);
  };

  const clearProcessSteps = () => {
    setProcessSteps([]);
    setIsProcessing(false);
  };

  const startProcessing = (initialStep) => {
    setIsProcessing(true);
    setProcessSteps([`🔄 ${initialStep}`]);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setLoading(false);
      clearProcessSteps();
      showSnackbar("Generation stopped", "info");
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() && !activeDocument) return;

    // Check if current model is STT and find a fallback chat model
    const currentModel = models.find(m => m.name === selectedModel);
    let chatModel = selectedModel;
    
    if (currentModel && currentModel.type === 'stt') {
      // Find first non-STT model as fallback
      const fallbackModel = models.find(m => m.type !== 'stt');
      if (fallbackModel) {
        chatModel = fallbackModel.name;
        showSnackbar(`Using ${fallbackModel.name} for chat (${selectedModel} is for audio transcription only)`, "info");
      } else {
        showSnackbar("No chat models available. Please select a chat model.", "error");
        return;
      }
    }

    // Add user message to chat
    const userMessage = {
      role: "user",
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setLoading(true);
    startProcessing(`Connecting to ${chatModel}...`);

    // Create abort controller for this request
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // Filter out system messages for display
      const chatMessages = messages.filter((msg) => msg.role !== "system");

      const requestData = {
        model: chatModel,
        messages: [...chatMessages, userMessage],
        systemPrompt: systemPrompt || undefined,
      };

      // Add document processing mode if a document is active
      if (activeDocument) {
        requestData.documentId = activeDocument.id;
        requestData.mode = documentMode;

        // Add specific chunk indices if in 'specific_chunks' mode
        if (documentMode === "specific_chunks" && selectedChunks.length > 0) {
          requestData.chunkIndices = selectedChunks;
        }

        // Add search query if in 'search' mode
        if (documentMode === "search" && searchQuery) {
          requestData.searchQuery = searchQuery;
        }
      }

      addProcessStep("Preparing your question...");

      const response = await axios.post(`${API_URL}/chat`, requestData, {
        signal: controller.signal
      });

      addProcessStep("Sending request to AI model...");

      if (response.data && response.data.message) {
        setMessages((prev) => [...prev, response.data.message]);
      }

      addProcessStep("Response received successfully!");

      // Clear steps after a short delay
      setTimeout(() => {
        clearProcessSteps();
      }, 2000);
    } catch (error) {
      console.error("Error sending message:", error);
      clearProcessSteps();

      if (error.name === 'AbortError') {
        // Request was aborted, don't show error message
        return;
      }

      if (error.response?.status === 400 && error.response?.data?.error?.includes("model is required")) {
        showSnackbar("Please select a valid model from the dropdown", "error");
      } else {
        showSnackbar("Failed to send message. Please check your connection.", "error");
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    setLoading(true);
    const uploadedDocs = [];
    
    try {
      // Upload files one by one to show progress
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("document", file);

        showSnackbar(`Uploading ${file.name} (${i + 1}/${files.length})...`, "info");

        const response = await axios.post(`${API_URL}/upload`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.data) {
          const newDoc = {
            id: response.data.documentId,
            filename: response.data.filename,
            type: response.data.type,
            size: response.data.size,
            chunkCount: response.data.chunkCount || response.data.totalChunks || 0,
            wordCount: response.data.wordCount || 0,
            pageEstimate: Math.ceil((response.data.wordCount || 0) / 250),
          };

          uploadedDocs.push(newDoc);
        }
      }

      // Add all uploaded documents to the list
      setDocuments(prev => [...prev, ...uploadedDocs]);

      // Set the last uploaded document as active
      if (uploadedDocs.length > 0) {
        const lastDoc = uploadedDocs[uploadedDocs.length - 1];
        setActiveDocument(lastDoc);

        if (lastDoc.chunkCount > 5) {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `I've loaded ${uploadedDocs.length} document(s). The last one "${lastDoc.filename}" (${lastDoc.pageEstimate} pages) is a large document with ${lastDoc.chunkCount} sections. I'll analyze parts of it as you ask questions, or you can use the Document tab to navigate specific sections.`,
            timestamp: new Date().toISOString(),
          }]);
        } else {
          setMessages(prev => [...prev, {
            role: "assistant", 
            content: `I've successfully loaded ${uploadedDocs.length} document(s). The active document is "${lastDoc.filename}" with ${lastDoc.chunkCount} sections. You can now ask me questions about ${uploadedDocs.length === 1 ? 'this document' : 'these documents'}.`,
            timestamp: new Date().toISOString(),
          }]);
        }
      }

      showSnackbar(`Successfully uploaded ${uploadedDocs.length} document(s)!`, "success");
    } catch (error) {
      console.error("Upload error:", error);
      showSnackbar(`Failed to upload documents: ${error.response?.data?.error || error.message}`, "error");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const handleVideoTranscription = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if file is a video
    if (!file.type.startsWith('video/')) {
      showSnackbar("Please select a video file", "error");
      return;
    }

    // Determine which whisper model to use
    const currentModel = models.find(m => m.name === selectedModel);
    let whisperModel = "whisper-base"; // default
    // Note: visionModel is always llama3.2-vision:11b for video analysis
    
    console.log("Selected model:", selectedModel);
    console.log("Current model object:", currentModel);
    
    if (currentModel && currentModel.type === 'stt') {
      // Extract whisper model name from the selected STT model
      if (selectedModel.includes('whisper-tiny')) {
        whisperModel = "whisper-tiny";
      } else if (selectedModel.includes('whisper-base')) {
        whisperModel = "whisper-base";
      }
    }
    
    console.log("Using whisper model:", whisperModel);
    
    const formData = new FormData();
    formData.append("video", file);
    formData.append("whisperModel", whisperModel);
    // visionModel no longer needed - backend always uses llama3.2-vision:11b
    
    setLoading(true);
    startProcessing("Preparing video for comprehensive analysis...");
  
    try {
      addProcessStep("Uploading video file to server...");
      addProcessStep("Extracting key frames from video...");
      addProcessStep("Analyzing visual content with AI...");
      addProcessStep("Extracting audio track from video...");
      addProcessStep(`Transcribing speech with ${whisperModel} AI...`);
      
      const response = await axios.post(`${API_URL}/analyze-video`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data) {
        addProcessStep("Combining visual and audio analysis...");
        addProcessStep("Creating searchable document chunks...");
        
        setDocuments(prev => [...prev, response.data]);
        setActiveDocument(response.data);
        setCurrentChunk(0);
        setSelectedChunks([0]);
        setDocumentTab(0);
        
        addProcessStep("Analysis complete! Ready for chat interaction.");
        
        // Clear steps after showing completion
        setTimeout(() => {
          clearProcessSteps();
        }, 3000);
        
        showSnackbar(`Video "${file.name}" analyzed successfully`, "success");
        
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `I've successfully analyzed your video "${file.name}"! \n\n🎬 **Analysis Complete:**\n- **Visual Analysis**: Analyzed key frames\n- **Audio Transcription**: Extracted and transcribed all speech with ${whisperModel}\n- **Document Created**: ${response.data.chunkCount} searchable chunks\n\nYou can now ask me questions about:\n- What you see in the video (people, objects, actions)\n- What was said (dialogue, speech content)\n- Speaking patterns and delivery\n- Multiple speakers or conversations\n- Any specific moments or topics\n\nWhat would you like to know about your video?`,
          },
        ]);
      }
    } catch (error) {
      console.error("Error analyzing video:", error);
      const errorMsg = error.response?.data?.suggestions?.join(". ") || "Failed to analyze video";
      clearProcessSteps();
      showSnackbar(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAudioUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if file is an audio file
    if (!file.type.startsWith('audio/')) {
      showSnackbar("Please select an audio file", "error");
      return;
    }

    const formData = new FormData();
    formData.append("audio", file);

    setLoading(true);
    startProcessing("Preparing audio for transcription...");
    
    try {
      addProcessStep("Uploading audio file to server...");
      addProcessStep("Processing audio with Whisper AI...");
      addProcessStep("Transcribing speech content...");
      
      const response = await axios.post(`${API_URL}/analyze-audio`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data) {
        addProcessStep("Creating searchable document chunks...");
        
        setDocuments((prev) => [...prev, response.data]);
        setActiveDocument(response.data);
        setCurrentChunk(0);
        setSelectedChunks([0]);
        setDocumentTab(0);
        
        addProcessStep("Transcription complete! Ready for chat interaction.");
        
        // Clear steps after showing completion
        setTimeout(() => {
          clearProcessSteps();
        }, 3000);
        
        showSnackbar(`Audio "${file.name}" transcribed successfully`, "success");
        
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `I've successfully transcribed your audio file "${file.name}"! \n\n🎤 **Transcription Complete:**\n- **Audio Processing**: Analyzed entire audio track\n- **Speech Recognition**: Converted speech to text using Whisper AI\n- **Document Created**: ${response.data.chunkCount} searchable chunks\n\nYou can now ask me questions about:\n- What was said in the audio\n- Specific topics or conversations\n- Speaking patterns and delivery\n- Multiple speakers (if present)\n- Any particular moments or quotes\n\nWhat would you like to know about your audio?`,
          },
        ]);
      }
    } catch (error) {
      console.error("Error analyzing audio:", error);
      const errorMsg = error.response?.data?.suggestions?.join(". ") || "Failed to analyze audio";
      clearProcessSteps();
      showSnackbar(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      showSnackbar("Please select an image file", "error");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/upload-image`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data) {
        // Add image to message
        const imageUrl = `${API_URL.replace('/api', '')}${response.data.url}`;
        
        // Add user message with image
        const userMessage = {
          role: "user",
          content: `![${response.data.filename}](${imageUrl})`,
        };

        setMessages((prev) => [...prev, userMessage]);
        showSnackbar("Image uploaded successfully", "success");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      showSnackbar("Failed to upload image", "error");
    } finally {
      setLoading(false);
      // Reset file input
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  const handleFetchDocumentChunk = async (docId, chunkIndex) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/document/${docId}/chunk/${chunkIndex}`
      );
      setLoading(false);
      return response.data;
    } catch (error) {
      console.error("Error fetching document chunk:", error);
      showSnackbar("Failed to fetch document chunk", "error");
      setLoading(false);
      return null;
    }
  };

  const handleSearchDocument = async () => {
    if (!activeDocument || !searchQuery.trim()) return;

    try {
      setLoading(true);
      const response = await axios.post(
        `${API_URL}/document/${activeDocument.id}/search`,
        {
          query: searchQuery,
        }
      );

      setSearchResults(response.data.results);

      if (response.data.results.length === 0) {
        showSnackbar("No matches found", "info");
      } else {
        // Select the chunks with matches for processing
        const matchedChunks = response.data.results.map((r) => r.chunkIndex);
        setSelectedChunks(matchedChunks);

        // Show the first matching chunk
        if (matchedChunks.length > 0) {
          setCurrentChunk(matchedChunks[0]);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Error searching document:", error);
      showSnackbar("Failed to search document", "error");
      setLoading(false);
    }
  };

  const handleRemoveDocument = (index) => {
    const docToRemove = documents[index];

    // Remove from documents list
    setDocuments((prev) => prev.filter((_, i) => i !== index));

    // Clear active document if it was the one removed
    if (activeDocument && activeDocument.id === docToRemove.id) {
      setActiveDocument(null);
    }
  };

  const handleSetActiveDocument = (doc) => {
    setActiveDocument(doc);
    // Only set current chunk if document has chunks
    if (doc.totalChunks > 0) {
      setCurrentChunk(0);
      setSelectedChunks([0]);
    } else {
      setCurrentChunk(-1);
      setSelectedChunks([]);
    }
    setSearchQuery("");
    setSearchResults([]);
    setDocumentTab(0);
  };

  const handleToggleChunkSelection = (chunkIndex) => {
    setSelectedChunks((prev) => {
      if (prev.includes(chunkIndex)) {
        return prev.filter((idx) => idx !== chunkIndex);
      } else {
        return [...prev, chunkIndex];
      }
    });
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleExportChat = async (format) => {
    handleMenuClose();

    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/export/chat`, {
        messages,
        format,
      });

      if (response.data && response.data.downloadUrl) {
        window.location.href = `${API_URL.replace('/api', '')}${response.data.downloadUrl.replace('/api', '')}`;
        showSnackbar(
          `Chat history exported as ${format.toUpperCase()}`,
          "success"
        );
      }
    } catch (error) {
      console.error("Error exporting chat:", error);
      showSnackbar("Failed to export chat history", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFileGenDialog = () => {
    handleMenuClose();
    setFileGenDialogOpen(true);
  };

  const handleCloseFileGenDialog = () => {
    setFileGenDialogOpen(false);
    setFileContent("");
    setFileName("");
  };

  const handleGenerateFile = async () => {
    if (!fileContent || !fileName) {
      showSnackbar("Content and filename are required", "error");
      return;
    }

    try {
      setLoading(true);

      let contentType = "text/plain";
      if (fileType === "json") contentType = "application/json";
      if (fileType === "csv") contentType = "text/csv";
      if (fileType === "html") contentType = "text/html";

      // Add extension if not present
      let finalFileName = fileName;
      if (!finalFileName.endsWith(`.${fileType}`)) {
        finalFileName += `.${fileType}`;
      }

      const response = await axios.post(`${API_URL}/generate/file`, {
        content: fileContent,
        filename: finalFileName,
        contentType,
      });

      if (response.data && response.data.downloadUrl) {
        window.location.href = `${API_URL.replace('/api', '')}${response.data.downloadUrl.replace('/api', '')}`;
        showSnackbar(
          `File "${finalFileName}" generated and downloaded`,
          "success"
        );
        handleCloseFileGenDialog();
      }
    } catch (error) {
      console.error("Error generating file:", error);
      showSnackbar("Failed to generate file", "error");
    } finally {
      setLoading(false);
    }
  };

  // Quick save message content to file
  const handleQuickSaveMessage = async (content, isAssistant = false) => {
    try {
      setLoading(true);
      const timestamp = Date.now();
      const prefix = isAssistant ? "assistant" : "user";
      const fileName = `${prefix}_message_${timestamp}.txt`;

      const response = await axios.post(`${API_URL}/generate/file`, {
        content,
        filename: fileName,
        contentType: "text/plain",
      });

      if (response.data && response.data.downloadUrl) {
        window.location.href = `${API_URL.replace('/api', '')}${response.data.downloadUrl.replace('/api', '')}`;
        showSnackbar(`Message saved and downloaded as ${fileName}`, "success");
      }
    } catch (error) {
      console.error("Error saving message:", error);
      showSnackbar("Failed to save message", "error");
    } finally {
      setLoading(false);
    }
  };

  const clearScreen = () => {
    setMessages([]);
    showSnackbar("Chat cleared", "success");
  };

  const exportAnalysisToWord = async (documentId, filename) => {
    try {
      // Collect AI responses from chat messages
      const aiResponses = messages
        .filter(msg => msg.role === 'assistant')
        .map(msg => msg.content)
        .join('\n\n---\n\n');

      if (!aiResponses.trim()) {
        showSnackbar("No AI analysis found to export. Please have a conversation with the AI first.", "warning");
        return;
      }

      const response = await axios.post(`${API_URL}/export-analysis`, {
        documentId: documentId,
        filename: filename,
        analysisContent: aiResponses
      }, {
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename.replace(/[^a-z0-9]/gi, '_')}_analysis.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSnackbar("Analysis exported to Word document", "success");
    } catch (error) {
      console.error("Error exporting to Word:", error);
      showSnackbar("Failed to export analysis", "error");
    }
  };

  const exportTranscriptToWord = async (documentId, filename) => {
    try {
      console.log(`Exporting transcript for document: ${documentId}, filename: ${filename}`);
      
      const response = await axios.post(`${API_URL}/export-transcript`, {
        documentId: documentId,
        filename: filename
      });

      console.log('Export response:', response.data);

      if (response.data.success) {
        // Download the file
        console.log(`Downloading file from: ${API_URL.replace('/api', '')}${response.data.downloadUrl.replace('/api', '')}`);
        
        const downloadResponse = await axios.get(`${API_URL.replace('/api', '')}${response.data.downloadUrl.replace('/api', '')}`, {
          responseType: 'blob'
        });

        console.log('Download response received, creating blob...');

        const blob = new Blob([downloadResponse.data], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename.replace(/[^a-z0-9]/gi, '_')}_transcript.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        showSnackbar("Transcript exported to Word document", "success");
      } else {
        console.error('Export failed - response.data.success is false:', response.data);
        showSnackbar(`Failed to export transcript: ${response.data.error || 'Unknown error'}`, "error");
      }
    } catch (error) {
      console.error("Error exporting transcript:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
      showSnackbar(`Failed to export transcript: ${errorMessage}`, "error");
    }
  };

  const exportAudioToFile = async (documentId, filename) => {
    try {
      const response = await axios.get(`${API_URL}/export-audio/${documentId}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'audio/wav' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSnackbar("Audio exported successfully!", "success");
    } catch (error) {
      console.error("Error exporting audio:", error);
      showSnackbar("Failed to export audio. Audio may not be available for this document.", "error");
    }
  };

  // Render the document explorer panel
  const renderDocumentExplorer = () => {
    if (!activeDocument) {
      return (
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography variant="body1" color="text.secondary">
            No document selected. Upload a document to begin.
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ p: 2 }}>
        <Tabs
          value={documentTab}
          onChange={handleDocumentTabChange}
          sx={{ mb: 2 }}
        >
          <Tab label="Overview" />
          <Tab label="Chunks" />
          <Tab label="Search" />
        </Tabs>

        {/* Overview Tab */}
        {documentTab === 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {activeDocument.pageEstimate} pages • {activeDocument.wordCount} words • {activeDocument.chunkCount} chunks
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="doc-mode-label">Processing Mode</InputLabel>
              <Select
                labelId="doc-mode-label"
                value={documentMode}
                label="Processing Mode"
                onChange={handleDocumentModeChange}
              >
                <MenuItem value="auto">
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <ArticleIcon sx={{ mr: 1 }} />
                    Auto (Default)
                  </Box>
                </MenuItem>
                <MenuItem value="summary">
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <SummarizeIcon sx={{ mr: 1 }} />
                    Summary
                  </Box>
                </MenuItem>
                <MenuItem value="specific_chunks">
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <FilterListIcon sx={{ mr: 1 }} />
                    Selected Chunks ({selectedChunks.length})
                  </Box>
                </MenuItem>
                <MenuItem value="search">
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <SearchIcon sx={{ mr: 1 }} />
                    Search
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <Typography variant="subtitle2" gutterBottom>
              Preview:
            </Typography>
            <Paper
              variant="outlined"
              sx={{ p: 2, mb: 2, maxHeight: 200, overflow: "auto" }}
            >
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {activeDocument.preview}
              </Typography>
            </Paper>

            <Box sx={{ mt: 4 }}>
              <Button
                variant="contained"
                fullWidth
                onClick={() => setDocumentMode("auto")}
                sx={{ mb: 1 }}
              >
                Analyze Document
              </Button>

              <Button
                variant="outlined"
                fullWidth
                onClick={() => setDocumentMode("summary")}
              >
                Generate Summary
              </Button>
            </Box>
          </Box>
        )}

        {/* Chunks Tab */}
        {documentTab === 1 && (
          <Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="subtitle1">
                Chunk {currentChunk + 1} of {activeDocument.chunkCount}
              </Typography>
              <Pagination
                count={activeDocument.chunkCount}
                page={currentChunk + 1}
                onChange={(e, page) => setCurrentChunk(page - 1)}
                size="small"
              />
            </Box>

            <Paper
              variant="outlined"
              sx={{ p: 2, mb: 2, maxHeight: 300, overflow: "auto" }}
            >
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {currentChunkContent}
              </Typography>
            </Paper>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="chunk-select-label">Selected Chunks</InputLabel>
              <Select
                labelId="chunk-select-label"
                multiple
                value={selectedChunks}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip
                        key={value}
                        label={`Chunk ${value + 1}`}
                        size="small"
                      />
                    ))}
                  </Box>
                )}
                label="Selected Chunks"
                sx={{ minHeight: 60 }}
              >
                {Array.from({ length: activeDocument.chunkCount }, (_, i) => (
                  <MenuItem
                    key={i}
                    value={i}
                    onClick={() => handleToggleChunkSelection(i)}
                    sx={{
                      backgroundColor: selectedChunks.includes(i)
                        ? "action.selected"
                        : "inherit",
                    }}
                  >
                    Chunk {i + 1}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              fullWidth
              onClick={() => {
                setDocumentMode("specific_chunks");
                handleSendMessage();
              }}
              disabled={selectedChunks.length === 0}
            >
              Analyze Selected Chunks
            </Button>
          </Box>
        )}

        {/* Search Tab */}
        {documentTab === 2 && (
          <Box>
            <TextField
              fullWidth
              label="Search Document"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleSearchDocument}
                      disabled={!searchQuery.trim()}
                    >
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSearchDocument();
                }
              }}
            />

            {searchResults.length > 0 && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  {searchResults.length} match
                  {searchResults.length > 1 ? "es" : ""} found
                </Typography>

                <List dense sx={{ mb: 2 }}>
                  {searchResults.map((result, index) => (
                    <ListItem
                      key={index}
                      button
                      onClick={() => setCurrentChunk(result.chunkIndex)}
                      sx={{
                        borderLeft:
                          currentChunk === result.chunkIndex
                            ? "3px solid"
                            : "none",
                        borderColor: "primary.main",
                        bgcolor:
                          currentChunk === result.chunkIndex
                            ? "action.selected"
                            : "inherit",
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2">
                          Chunk {result.chunkIndex + 1} ({result.matches} match
                          {result.matches > 1 ? "es" : ""})
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                        >
                          {result.preview}
                        </Typography>
                      </Box>
                    </ListItem>
                  ))}
                </List>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => {
                    setDocumentMode("search");
                    handleSendMessage();
                  }}
                >
                  Analyze Search Results
                </Button>
              </>
            )}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: "flex", height: "100vh" }}>
        {/* Left Half: AI Studio with margins */}
        <Box
          sx={{ 
            width: "50%",
            display: "flex", 
            flexDirection: "column", 
            p: 3, // Padding for margins
            backgroundColor: '#FAF0E6', // Cream background
          }}
        >
          {/* Header */}
          <Typography
            variant="h4"
            component="h1"
            sx={{
              background: "linear-gradient(45deg, #E91E63 30%, #FF69B4 90%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: "bold",
              fontFamily: "'Inter', sans-serif",
              mb: 3,
              textAlign: "center"
            }}
          >
            AI Studio
          </Typography>

          {/* Model Selection and Controls */}
          <Box sx={{ mb: 3 }}>
            {/* Model Dropdown - Full Width */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="model-select-label">Model</InputLabel>
              <Select
                labelId="model-select-label"
                value={selectedModel}
                label="Model"
                onChange={handleModelChange}
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E91E63',
                    borderWidth: '2px',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E91E63',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E91E63',
                  },
                }}
              >
                {/* Sort models to put llava first, then llama3.2 models together */}
                {models
                  .sort((a, b) => {
                    // Put llava first
                    if (a.name.includes('llava') && !b.name.includes('llava')) return -1;
                    if (!a.name.includes('llava') && b.name.includes('llava')) return 1;
                    // Then put llama3.2 models next
                    if (a.name.includes('llama3.2') && !b.name.includes('llama3.2')) return -1;
                    if (!a.name.includes('llama3.2') && b.name.includes('llama3.2')) return 1;
                    return a.name.localeCompare(b.name);
                  })
                  .map((model) => (
                  <MenuItem key={model.name} value={model.name}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span>{model.name}</span>
                      <Chip 
                        label={model.type === 'stt' ? 'STT' : 'Ollama'} 
                        size="small" 
                        color={model.type === 'stt' ? 'secondary' : 'primary'}
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* Control Buttons - Same Line */}
            <Box sx={{ display: "flex", gap: 2, justifyContent: "space-between" }}>
              <Button
                variant="outlined"
                onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                sx={{ flex: 1 }}
              >
                {showSystemPrompt ? "Hide System" : "System Prompt"}
              </Button>
              
              <Button
                variant="outlined"
                onClick={clearScreen}
                sx={{ flex: 1 }}
                startIcon={<span>🗑️</span>}
              >
                Clear Chat
              </Button>
              
              <Button
                variant="outlined"
                onClick={stopGeneration}
                sx={{ flex: 1 }}
                startIcon={<span>⏹️</span>}
              >
                Stop Generation
              </Button>
            </Box>
          </Box>

          {showSystemPrompt && (
            <TextField
              fullWidth
              label="System Prompt"
              multiline
              rows={2}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              margin="normal"
              placeholder="Instructions for the assistant..."
              disabled={loading}
              sx={{ mb: 2 }}
            />
          )}

          {/* Chat Messages */}
          <Paper
            elevation={3}
            sx={{
              flexGrow: 1,
              p: 2,
              mb: 2,
              overflowY: "auto",
              border: "2px solid #E91E63",
            }}
          >
            {messages.length === 0 ? (
              <Box sx={{ textAlign: "center", mt: 4 }}>
                <Typography
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  Send a message, upload a document, or upload a video to start chatting
                </Typography>
                
                <Typography variant="h6" color="primary" sx={{ mb: 2, textAlign: "center" }}>
                  📋 Analysis Steps
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: "left" }}>
                  📄 <strong>TEXT (Document Analysis):</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, paddingLeft: "24px" }}>
                  1) Select any chat model
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, paddingLeft: "24px" }}>
                  2) Upload document (PDF, DOCX, TXT)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, paddingLeft: "24px" }}>
                  3) AI analyzes document content
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, paddingLeft: "24px" }}>
                  4) Chat about document content
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, paddingLeft: "24px" }}>
                  5) Export analysis
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: "left" }}>
                  🎤 <strong>AUDIO (Transcription Only):</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, paddingLeft: "24px" }}>
                  1) Select Whisper model
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, paddingLeft: "24px" }}>
                  2) Upload audio file
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, paddingLeft: "24px" }}>
                  3) AI transcribes speech to text
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, paddingLeft: "24px" }}>
                  4) Chat about transcript content
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, paddingLeft: "24px" }}>
                  5) Export transcript
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: "left" }}>
                  📹 <strong>VIDEO (Full Audio Analysis):</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, paddingLeft: "24px" }}>
                  1) Select LLaVA model
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, paddingLeft: "24px" }}>
                  2) Upload video file
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, paddingLeft: "24px" }}>
                  3) AI analyzes video + extracts/analyzes audio
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, paddingLeft: "24px" }}>
                  4) Chat about visual + audio content
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, paddingLeft: "24px" }}>
                  5) Export complete analysis
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                  Choose your model above, then upload a file to start analyzing!
                </Typography>
              </Box>
            ) : (
              messages.map((message, index) => (
                <Box
                  key={index}
                  sx={{
                    mb: 2,
                    alignSelf:
                      message.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                    ml: message.role === "user" ? "auto" : 0,
                    mr: message.role === "assistant" ? "auto" : 0,
                  }}
                >
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      bgcolor:
                        message.role === "user"
                          ? "primary.light"
                          : "background.paper",
                      color:
                        message.role === "user"
                          ? "primary.contrastText"
                          : "text.primary",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {message.role === "user" ? "You" : "Assistant"}
                      </Typography>
                      <Tooltip title="Save message to file">
                        <IconButton
                          size="small"
                          onClick={() =>
                            handleQuickSaveMessage(
                              message.content,
                              message.role === "assistant"
                            )
                          }
                        >
                          <SaveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </Paper>
                </Box>
              ))
            )}
            {loading && (
              <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
          </Paper>

          {/* Message Input */}
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                activeDocument 
                  ? `Ask questions about "${activeDocument.filename}" - e.g., "How did my tone sound?" or "What speaking patterns do you notice?"`
                  : "Type your message..."
              }
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#E91E63',
                    borderWidth: '2px',
                  },
                  '&:hover fieldset': {
                    borderColor: '#E91E63',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#E91E63',
                  },
                },
                '& .MuiInputBase-input::placeholder': {
                  color: theme.palette.text.secondary,
                  opacity: 0.8,
                  fontSize: "0.875rem",
                  lineHeight: 1.2,
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={loading || !message.trim()}
              sx={{ minWidth: 80 }}
            >
              Send
            </Button>
          </Box>

          {/* Upload Buttons */}
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
            <Button
              component="label"
              variant="outlined"
              startIcon={<UploadFileIcon />}
              size="small"
              disabled={loading}
            >
              Upload Documents (Multiple)
              <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={handleFileUpload}
                accept="*/*"
                multiple
              />
            </Button>
            <Button
              component="label"
              variant="outlined"
              startIcon={<VideoFileIcon />}
              size="small"
              disabled={loading}
            >
              Upload Video
              <input
                ref={videoInputRef}
                type="file"
                hidden
                onChange={handleVideoTranscription}
                accept="video/*"
              />
            </Button>
            <Button
              component="label"
              variant="outlined"
              startIcon={<AudioFileIcon />}
              size="small"
              disabled={loading}
            >
              Upload Audio
              <input
                ref={audioInputRef}
                type="file"
                hidden
                onChange={handleAudioUpload}
                accept="audio/*"
              />
            </Button>
          </Box>
        </Box>

        {/* Right Half: Document Viewer */}
        <Box sx={{ 
          width: "50%", 
          display: "flex", 
          flexDirection: "column", 
          p: 3,
          backgroundColor: '#FAF0E6', // Same cream background as left side
        }}>
          <Typography
            variant="h4"
            sx={{
              mb: 3,
              textAlign: "center",
              background: "linear-gradient(45deg, #E91E63 30%, #FF69B4 90%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: "bold",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Document Viewer
          </Typography>

          <Paper
            elevation={3}
            sx={{
              flexGrow: 1,
              p: 2,
              border: "2px solid #E91E63",
              display: "flex",
              flexDirection: "column",
              mb: 2,
            }}
          >
            {activeDocument && (
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6">
                  {activeDocument.filename}
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setActiveDocument(null)}
                >
                  ✕ Close
                </Button>
              </Box>
            )}

            {!activeDocument ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Upload a document or video to view analysis here
                </Typography>
                
                {documents.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Available Documents:
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
                      {documents.map((doc, index) => (
                        <Chip
                          key={index}
                          label={doc.filename}
                          variant="outlined"
                          onClick={() => handleSetActiveDocument(doc)}
                          avatar={
                            <Badge badgeContent={doc.chunkCount} color="secondary">
                              <DescriptionIcon />
                            </Badge>
                          }
                          sx={{ m: 0.5 }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
                {renderDocumentExplorer()}
              </Box>
            )}
          </Paper>

          {/* Export Buttons */}
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              onClick={() => activeDocument && exportAnalysisToWord(activeDocument.id, activeDocument.filename)}
              disabled={!activeDocument}
              size="small"
            >
              Export Analysis
            </Button>
            <Button
              variant="outlined"
              onClick={() => activeDocument && exportTranscriptToWord(activeDocument.id, `${activeDocument.filename}_transcript`)}
              disabled={!activeDocument}
              size="small"
            >
              Export Transcript
            </Button>
            <Button
              variant="outlined"
              onClick={() => activeDocument && exportAudioToFile(activeDocument.id, activeDocument.filename)}
              disabled={!activeDocument}
              size="small"
            >
              Export Audio
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Process Steps Display at Bottom */}
      {isProcessing && (
        <Paper
          elevation={3}
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            backgroundColor: theme.palette.background.paper,
            borderTop: `2px solid ${theme.palette.primary.main}`,
            zIndex: 1000,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <CircularProgress size={20} color="primary" />
            <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
              Processing...
            </Typography>
            <Box sx={{ flex: 1 }}>
              {processSteps.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  {processSteps[processSteps.length - 1]}
                </Typography>
              )}
            </Box>
          </Box>
          {processSteps.length > 1 && (
            <Box sx={{ mt: 1, maxHeight: 100, overflowY: "auto" }}>
              {processSteps.slice(0, -1).map((step, index) => (
                <Typography
                  key={index}
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", opacity: 0.7 }}
                >
                  {step}
                </Typography>
              ))}
            </Box>
          )}
        </Paper>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;
