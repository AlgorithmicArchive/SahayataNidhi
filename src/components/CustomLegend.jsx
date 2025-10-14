import React from "react";

const CustomLegend = ({ payload }) => {
  if (!payload) return null;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        background: "rgba(255,255,255,0.8)",
        border: "1px solid #ddd",
        borderRadius: "12px",
        padding: "10px 16px",
        marginTop: "10px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
      }}
    >
      {payload.map((entry, index) => (
        <div
          key={`item-${index}`}
          style={{
            display: "flex",
            alignItems: "center",
            margin: "6px 12px",
            fontSize: "14px",
            color: "#333",
            fontWeight: 500,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: entry.color,
              marginRight: 8,
              border: "1px solid #ccc",
            }}
          />
          {entry.value}
        </div>
      ))}
    </div>
  );
};
export default CustomLegend;
