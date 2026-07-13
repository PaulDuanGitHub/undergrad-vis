export const extension = {
  // --- 3D & Design (Creative) ---
  ".blend": { 
    type: "Blender Workfile", 
    description: "The engine for 3D modeling, rigging, and rendering. Where geometric concepts meet visual art." 
  },
  ".kra": { 
    type: "Krita Workfile", 
    description: "Digital painting and raster graphics. Used for storyboarding and 2D asset creation." 
  },

  // --- Core Programming & Systems ---
  ".hs": { 
    type: "Haskell Source", 
    description: "Purely functional programming. A strict, math-driven approach to logic and types." 
  },
  ".h": { 
    type: "C/C++ Header", 
    description: "The blueprints of C/C++ projects, defining structures and interfaces before the actual logic." 
  },
  ".c": { 
    type: "C Source", 
    description: "Low-level, procedural systems programming. Dealing directly with memory and hardware." 
  },
  ".cpp": { 
    type: "C++ Source", 
    description: "Object-oriented systems programming. Building complex, performance-critical architectures." 
  },
  ".elm": { 
    type: "Elm Source", 
    description: "Functional frontend language. Used to build reliable, no-runtime-exception web interfaces." 
  },
  ".java": { 
    type: "Java Source", 
    description: "Strict, class-based object-oriented architecture. The standard for enterprise-level coursework." 
  },

  // --- Data Science & AI ---
  ".ipynb": { 
    type: "Jupyter Notebook", 
    description: "Interactive data science environment. Blending live Python execution, math, and data visualization." 
  },
  ".py": { 
    type: "Python Source", 
    description: "High-level, highly readable scripting. The go-to tool for algorithms, automation, and machine learning." 
  },

  // --- Academic Writing & Documentation ---
  ".tex": { 
    type: "LaTeX Source", 
    description: "The gold standard for academic writing. Code-driven typesetting for mathematical proofs and thesis formatting." 
  },
  ".md": { 
    type: "Markdown Document", 
    description: "Lightweight, plain-text formatting. Essential for repository documentation, READMEs, and quick notes." 
  },
  ".txt": { 
    type: "Plain Text", 
    description: "Raw, unformatted sequences of characters. Often used for raw data inputs or scratchpad thoughts." 
  },

  // --- Office & General Productivity ---
  ".docx": { 
    type: "Word Document", 
    description: "Standard word processing. Primarily used for general electives and non-technical essay submissions." 
  },
  ".pptx": { 
    type: "PowerPoint Presentation", 
    description: "Slide deck creation. The medium for presenting project pitches and final defenses." 
  },
  ".xlsx": { 
    type: "Excel Worksheet", 
    description: "Grid-based spreadsheet data. Used for basic data logging and tabular organization." 
  }
};

export const extensionBackgroundSchema = {
  ".blend": { primary: "#E87D0D", secondary: "#FFA342", tertiary: "#FFE0C0" },
  ".kra": { primary: "#FE4B9C", secondary: "#FF8BC0", tertiary: "#FFC0DD" },

  ".hs": { primary: "#43385F", secondary: "#6E6191", tertiary: "#D3C1FF" },
  ".h": { primary: "#6295CB", secondary: "#96BDE6", tertiary: "#C3E0FF" },
  ".c": { primary: "#005697", secondary: "#3383BF", tertiary: "#A1D6FF" },
  ".cpp": { primary: "#00427E", secondary: "#2968A1", tertiary: "#8EC9FF" },
  ".elm": { primary: "#5DAEC6", secondary: "#85CADE", tertiary: "#BCF0FF" },
  ".ipynb": { primary: "#EB7325", secondary: "#FF9D5D", tertiary: "#FFD6BB" },
  ".java": { primary: "#ED8B00", secondary: "#FFB246", tertiary: "#FFE4BE" },
  ".py": { primary: "#356A97", secondary: "#88AAC6", tertiary: "#C0E2FF" },

  ".docx": { primary: "#295394", secondary: "#5382CC", tertiary: "#BDD7FF" },
  ".pptx": { primary: "#D55825", secondary: "#EE885E", tertiary: "#FFD2BF" },
  ".xlsx": { primary: "#016E38", secondary: "#289C62", tertiary: "#B2ECCF" },
  ".tex": { primary: "#1F1F1F", secondary: "#515151", tertiary: "#C7C7C7" },
  ".md": { primary: "#1F1F1F", secondary: "#515151", tertiary: "#C7C7C7" },
  ".txt": { primary: "#1F1F1F", secondary: "#515151", tertiary: "#C7C7C7" },
};

export const extensionForegroundSchema = {
  ".blend": { primary: "#1F0E00", secondary: "#291300", tertiary: "#3D1B00" },
  ".kra": { primary: "#20000D", secondary: "#360017", tertiary: "#4A0021" },

  ".hs": { primary: "#F1EDF7", secondary: "#F7F5FC", tertiary: "#1D1236" },
  ".h": { primary: "#03182E", secondary: "#051E38", tertiary: "#072342" },
  ".c": { primary: "#EBF5FF", secondary: "#000B14", tertiary: "#002542" },
  ".cpp": { primary: "#EBF5FF", secondary: "#F4F9FF", tertiary: "#001C38" },
  ".elm": { primary: "#031E26", secondary: "#042630", tertiary: "#052F3B" },
  ".ipynb": { primary: "#240B00", secondary: "#2E1100", tertiary: "#3B1A04" },
  ".java": { primary: "#241100", secondary: "#2E1C00", tertiary: "#3B270C" },
  ".py": { primary: "#F2F7FA", secondary: "#021424", tertiary: "#051E33" },

  ".docx": { primary: "#F0F4FA", secondary: "#021124", tertiary: "#051933" },
  ".pptx": { primary: "#FFF2EB", secondary: "#2E0E00", tertiary: "#3B1506" },
  ".xlsx": { primary: "#EBF7F0", secondary: "#001F10", tertiary: "#003018" },
  ".tex": { primary: "#F5F5F5", secondary: "#FAFAFA", tertiary: "#121212" },
  ".md": { primary: "#F5F5F5", secondary: "#FAFAFA", tertiary: "#121212" },
  ".txt": { primary: "#F5F5F5", secondary: "#FAFAFA", tertiary: "#121212" },
};


export const groupedExtensions = [
  [".blend", ".kra"],
  [".hs", ".h", ".c", ".cpp", ".elm", ".ipynb", ".py", ".java"],
  [".docx", ".pptx", ".xlsx", ".tex", ".md", ".txt"]
];