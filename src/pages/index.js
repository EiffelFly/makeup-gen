import { Inter } from "next/font/google";
import { useState } from "react";
import ColorThief from "colorthief";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const [uploadedImgFile, setUploadedImgFile] = useState(null);
  const [uploadedImgUrl, setUploadedImgUrl] = useState(null);

  const [palette, setPalette] = useState([]);
  const [colorNames, setColorNames] = useState([]);
  const [isLoadingColors, setIsLoadingColors] = useState(false);

  const [captions, setCaptions] = useState(null);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [captionsGenerationError, setCaptionsGenerationError] = useState(null);

  const [characterDesign, setCharacterDesign] = useState(null);

  const [makeupImg, setMakeupImg] = useState(null);
  const [isGeneratingMakeupImg, setIsGeneratingMakeupImg] = useState(false);
  const [makeupImgGenerationError, setMakeupImgGenerationError] =
    useState(null);

  const [canGenerate, setCanGenerate] = useState(false);

  const handleGeneration = async () => {
    // We don't want to generate if we don't have the palette and URL
    if (!palette || !uploadedImgUrl) {
      return;
    }

    setCaptions(null);
    setCharacterDesign(null);
    setMakeupImg(null);

    // (4) To get the base64 string, you need to load the image with Fi
    const reader = new FileReader();
    reader.readAsDataURL(uploadedImgFile);
    reader.onload = async function () {
      console.log("begin generation");

      // (5) Post hugging face image to caption api to get the caption
      setIsGeneratingCaptions(true);
      const generateCaption = await fetch(
        process.env.NEXT_PUBLIC_IMAGE_TO_CAPTION_API_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: [reader.result],
          }),
        }
      );

      if (!generateCaption.ok) {
        setCaptionsGenerationError("Failed to generate captions");
        setIsGeneratingCaptions(false);
        return;
      }

      const data = await generateCaption.json();
      const captions = data.data[0];
      setCaptions(captions);
      setIsGeneratingCaptions(false);

      // (6) Here is how we write the prompt
      const characterDesign = `
        A front face makeup look with a vibe of ${captions}; colours of ${palette.toString()}
        single image, 8k RAW
      `;

      setCharacterDesign(characterDesign);

      // (7) Call HG stable diffusion model to generate image using character description
      setIsGeneratingMakeupImg(true);
      const generateMakeupImg = await fetch(
        process.env.NEXT_PUBLIC_STABLE_DIFFUSION_API_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: [characterDesign],
          }),
        }
      );

      if (!generateMakeupImg.ok) {
        setMakeupImgGenerationError("Failed to generate makeup image");
        setIsGeneratingMakeupImg(false);
        return;
      }

      const generateMakeupImgData = await generateMakeupImg.json();

      console.log(generateMakeupImgData);
      setMakeupImg(generateMakeupImgData.data[0]);
      setIsGeneratingMakeupImg(false);
    };
  };

  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-between p-24 ${inter.className}`}
    >
      <div className="flex flex-col gap-y-5 w-[768px]">
        <div className="w-full flex">
          {uploadedImgUrl ? (
            <img
              className="h-[360px] m-auto"
              src={uploadedImgUrl}
              onLoad={async (img) => {
                // (2) We load the user uploaded image here and the we retrieve the color
                // palette from it using color thief. We transfer the rgba color to hex color
                // We then call the color api to get the color names

                setIsLoadingColors(true);
                const colorThief = new ColorThief();

                // Get the palette from the image, the second argument is the number of colors to return
                const palette = colorThief.getPalette(img.currentTarget, 3);

                // Convert the RGB values to hex
                let hexPalette = [];
                for (const color of palette) {
                  hexPalette.push(rgbToHex(color[0], color[1], color[2]));
                }

                setPalette(hexPalette);

                // Call color json api to get the color names
                let colorNames = [];

                for (const color of hexPalette) {
                  const response = await fetch(
                    `https://www.thecolorapi.com/id?hex=${color.replace(
                      "#",
                      ""
                    )}`
                  );

                  const data = await response.json();
                  colorNames.push(data.name.value);
                }
                setColorNames(colorNames);

                // We enable generation button until we have the color names
                setCanGenerate(true);
                setIsLoadingColors(false);
              }}
            />
          ) : (
            // (1) This is where we upload the image, we get the FILE and URL from them
            <>
              <label
                className="flex w-full border rounded-lg h-[360px]"
                htmlFor="image"
              >
                <span className="m-auto">Upload a image</span>
              </label>
              <input
                className="hidden"
                id="image"
                type="file"
                onChange={async (e) => {
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
            </>
          )}
        </div>
        <div className="flex flex-col gap-y-5">
          <div className="flex flex-col gap-y-2">
            <p className="text-xl font-semibold">Colors</p>
            {colorNames.length === 0 ? (
              <span className="px-4 py-2 border rounded-lg h-[42px]">
                {isLoadingColors ? "Loading..." : null}
              </span>
            ) : (
              <p className="text-base font-normal px-4 py-2 border rounded-lg">
                {colorNames.join(", ")}
              </p>
            )}
          </div>
          {/* 
            (2.5) We can only generate the captions when we have the color names
          */}
          <button
            disabled={canGenerate ? false : true}
            onClick={handleGeneration}
            className="border py-2 rounded-lg disabled:border-dashed disabled:text-gray-500 hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-800"
          >
            Generate
          </button>
          <div className="flex flex-col gap-y-2">
            <p className="text-xl font-semibold">Caption</p>
            {captions ? (
              <p className="text-base font-normal px-4 py-2 border rounded-lg">
                {captions}
              </p>
            ) : (
              <span className="px-4 py-2 border rounded-lg h-[42px]">
                {captionsGenerationError
                  ? captionsGenerationError
                  : isGeneratingCaptions
                  ? "Generating..."
                  : null}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-y-2">
            <p className="text-xl font-semibold">Character Design Prompt</p>
            <p className="text-base font-normal px-4 py-2 border rounded-lg">
              {characterDesign}
            </p>
          </div>
          <div className="flex flex-col gap-y-2">
            <p className="text-xl font-semibold">Makeup Image</p>
            {makeupImg ? (
              <img className="w-full h-[500px]" src={makeupImg} />
            ) : (
              <span className="px-4 py-2 border rounded-lg h-[500px]">
                {makeupImgGenerationError
                  ? makeupImgGenerationError
                  : isGeneratingMakeupImg
                  ? "Generating..."
                  : null}
              </span>
            )}
          </div>
        </div>
      </div>
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
