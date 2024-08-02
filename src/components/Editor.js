import React, { useEffect, useState, useRef } from "react";
import { CgSoftwareDownload as SaveIcon } from "react-icons/cg";
import { MdContentCopy as CopyIcon } from "react-icons/md";
import { MdDelete as CleanIcon } from "react-icons/md";
import placeholder from "./Placeholder";
import AceEditor from "react-ace";
import "ace-builds/webpack-resolver";
import useClipboard from "react-use-clipboard";
import "ace-builds/src-noconflict/mode-latex";
import "ace-builds/src-noconflict/snippets/latex";
import "ace-builds/src-noconflict/ext-language_tools";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import AIPromptPopup from "./AIPromptPopUp";
import axios from "axios";


function Editor({ content, changeContent, isCompiled, compiled }) {
  const [open, setOpen] = useState(false);
  const editorRef = useRef(null);
  const [isCopied, setCopied] = useClipboard(content);
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [aiResponse, setAIResponse] = useState("");
  const [annotations, setAnnotations] = useState([]);

  useEffect(() => {

    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === "i") {
        event.preventDefault();
        const { top, left } = editorRef.current.editor.getCursorPosition();
        const { pageX, pageY } = event;
        setPopupPosition({ top: pageY, left: pageX });
        setShowPopup(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };

    if (content === "") {
      localStorage.setItem("latex", placeholder);
    } else {
      localStorage.setItem("latex", content);
    }
  }, [content]);

  useEffect(() => {
    if (content === "") {
      var encodedString = new Buffer.from(placeholder).toString("base64");
    } else {
      var encodedString = new Buffer.from(content).toString("base64");
    }

    const formData = new FormData();
    formData.append("tex", encodedString);

    fetch("/compile", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        return response.json();
      })
      .then((response) => {
        setAnnotations(response);
        isCompiled(false);
      })
      .catch((error) => console.log(error));
  }, [compiled]);

  const handleEditorChange = (value, event) => {
    changeContent(value);
  };

  const handleClearClick = () => {
    changeContent("");
  };

  const handlePromptSubmit = async (prompt) => {
    try {
      console.log(prompt)
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions',{
        "model": "meta-llama/llama-3.1-8b-instruct:free",
        "messages": [
          {"role": "user", "content": "give me basic jake resume template"},
        ],
      }, {
        headers: {
          'Authorization': `Bearer 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`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log(response);
      const data = await response.json();
      console.log(response.choices[0].message.content);
      setAIResponse(response.choices[0].message.content);
      console.log(aiResponse)
      
      
      const cursorPosition = editorRef.current.editor.getCursorPosition();
      const session = editorRef.current.editor.getSession();
      session.insert(cursorPosition, data.response);
      
      setShowPopup(false);
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
    }
  };

  const handleDownloadClick = () => {
    let blob = new Blob([content], {
      type: "text/plain",
    });
    let a = document.createElement("a");
    a.download = "latex.tex";
    a.href = window.URL.createObjectURL(blob);
    a.click();
  };

  const handleCopyClick = () => {
    setCopied(content);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div className="tex-editor scroll">
      <div className="section-title">
        <h3>Editor</h3>
        <div className="right-section">
          <Tooltip title="Download Latex">
            <button onClick={handleDownloadClick} className="btn">
              <SaveIcon />
            </button>
          </Tooltip>
          <Tooltip title="Copy to Clipboard">
            <button onClick={handleCopyClick} className="btn">
              <CopyIcon />
            </button>
          </Tooltip>
          <Tooltip title="Clear">
            <button onClick={handleClearClick} className="btn">
              <CleanIcon />
            </button>
          </Tooltip>
        </div>
      </div>

      <Snackbar open={open} autoHideDuration={2000} onClose={handleClose}>
        <Alert
          onClose={handleClose}
          severity="success"
          elevation={6}
          variant="filled"
        >
          <AlertTitle>Copied</AlertTitle>
          The latex is copied to your clipboard
        </Alert>
      </Snackbar>
      <AceEditor
        mode="latex"
        value={content}
        theme="dracula"
        className="editable editor"
        onChange={handleEditorChange}
        onValidate={setAnnotations}
        name="editor"
        height="96%"
        width="100%"
        fontSize="15px"
        ref={editorRef}
        annotations={annotations}
        enableBasicAutocompletion={true}
        enableLiveAutocompletion={true}
        enableSnippets={true}
        editorProps={{ $blockScrolling: true }}
      />
       {showPopup && (
        <AIPromptPopup
          position={popupPosition}
          onClose={() => setShowPopup(false)}
          onSubmit={handlePromptSubmit}
        />
      )}
    </div>
  );
}
export default Editor;
