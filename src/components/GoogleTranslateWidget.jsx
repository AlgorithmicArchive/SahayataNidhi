import React, { useEffect } from "react";

const GoogleTranslateWidget = () => {
  useEffect(() => {
    const googleTranslateScriptUrl =
      "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";

    // Load Google Translate script
    const loadGoogleTranslateScript = () => {
      return new Promise((resolve, reject) => {
        if (
          !document.querySelector(`script[src="${googleTranslateScriptUrl}"]`)
        ) {
          const script = document.createElement("script");
          script.type = "text/javascript";
          script.src = googleTranslateScriptUrl;
          script.async = true;
          script.defer = true;

          script.onload = resolve;
          script.onerror = reject;

          document.body.appendChild(script);
        } else {
          resolve(); // If script is already present, resolve immediately
        }
      });
    };

    // Initialize Google Translate widget after script loading
    const initializeGoogleTranslateWidget = () => {
      if (window.google && window.google.translate) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en",
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          "google_translate_element",
        );
      }
    };

    // Assign the initialization function to the global scope
    window.googleTranslateElementInit = () => {
      initializeGoogleTranslateWidget();
    };

    // Load the script and handle initialization
    loadGoogleTranslateScript()
      .then(() => {
        // Check if google.translate is available before initializing
        if (window.google && window.google.translate) {
          initializeGoogleTranslateWidget();
        }
      })
      .catch((error) => {
        console.error("Error loading Google Translate script:", error);
      });
  }, []);

  return <div id="google_translate_element" />;
};

export default GoogleTranslateWidget;
