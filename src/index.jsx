// At the TOP of your main entry file
import '@tensorflow/tfjs';
console.log('TensorForce.js loaded in main bundle');

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";

const root = createRoot(document.getElementById("root")); // Create a root
root.render(<App />);
