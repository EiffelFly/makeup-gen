import Image from "next/image";
import { Inter } from "next/font/google";
import { useEffect, useState } from "react";
import ColorThief from "colorthief";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const [uploadedImgFile, setUploadedImgFile] = useState(null);
  const [uploadedImgUrl, setUploadedImgUrl] = useState(null);
  const [palette, setPalette] = useState([]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <img
        src={uploadedImgUrl}
        onLoad={(img) => {
          const colorThief = new ColorThief();

          // Get the palette from the image, the second argument is the number of colors to return
          const palette = colorThief.getPalette(img.currentTarget, 8);

          // Convert the RGB values to hex
          let hexPalette = [];
          for (const color of palette) {
            hexPalette.push(rgbToHex(color[0], color[1], color[2]));
          }

          setPalette(hexPalette);
        }}
      />
      <input
        id="uploaded-img"
        type="file"
        onChange={(e) => {
          if (!e.target.files || e.target.files.length === 0) {
            setUploadedImgFile(null);
            return;
          }

          const uploadedImgFile = e.target.files[0];
          const objectUrl = URL.createObjectURL(uploadedImgFile);

          setUploadedImgFile(uploadedImgFile);
          setUploadedImgUrl(objectUrl);
        }}
      />
    </main>
  );
}

function rgbToHex(r, g, b) {
  // Ensure that the input values are valid (0-255)
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
    throw new Error("Invalid RGB values. Expected values between 0 and 255.");
  }

  // Convert each RGB component to a 2-digit hexadecimal string
  var hexR = r.toString(16).padStart(2, "0");
  var hexG = g.toString(16).padStart(2, "0");
  var hexB = b.toString(16).padStart(2, "0");

  // Concatenate the hexadecimal components to form the final hex string
  var hex = "#" + hexR + hexG + hexB;

  return hex;
}
