import { Inter } from "next/font/google";
import { useState } from "react";
import ColorThief from "colorthief";
import { Configuration, OpenAIApi } from "openai";

const inter = Inter({ subsets: ["latin"] });

const configuration = new Configuration({
  organization: process.env.NEXT_PUBLIC_OPENAI_ORG,
  apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY,
});
const openai = new OpenAIApi(configuration);

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
  const [isGeneratingCharacterDesign, setIsGeneratingCharacterDesign] =
    useState(false);
  const [characterDesignGenerationError, setCharacterDesignGenerationError] =
    useState(null);

  const [makeupImg, setMakeupImg] = useState(null);
  const [isGeneratingMakeupImg, setIsGeneratingMakeupImg] = useState(false);
  const [makeupImgGenerationError, setMakeupImgGenerationError] =
    useState(null);

  const [canGenerate, setCanGenerate] = useState(false);

  const handleGeneration = async () => {
    if (!palette || !uploadedImgUrl) {
      return;
    }

    setCaptions(null);
    setCharacterDesign(null);
    setMakeupImg(null);

    const reader = new FileReader();
    reader.readAsDataURL(uploadedImgFile);
    reader.onload = async function () {
      console.log("begin generation");
      // Post hugging face image to caption api to get the caption
      setIsGeneratingCaptions(true);
      const response = await fetch(
        process.env.NEXT_PUBLIC_IMAGE_TO_CAPTION_API_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: [reader.result],
          }),
        }
      );

      if (!response.ok) {
        setCaptionsGenerationError("Failed to generate captions");
        setIsGeneratingCaptions(false);
        return;
      }

      const data = await response.json();
      const captions = data.data[0];
      setCaptions(captions);
      setIsGeneratingCaptions(false);

      // Post ChatGPT API to generate the character description

      // const content = `
      //   You are a character designer GPT, Here are some of the good example of stable diffusion model prompt

      //   - (masterpiece)+, (best quality)+, (ultra highres)+, (photorealistic)+, (8k, RAW photo)+, (soft focus)+, 1 woman, posh, (sharp focus)+, (korean)+, (american)+, detailed beautiful face, black hair, (detailed open blazer)+, tie, beautiful white shiny humid skin, smiling
      //   - A highly detailed and realistic full-body photo from a fantasy movie where a yountg girl is wearing a white strapless tube top, has bright blue hair, is laughing, is drinking wine in a medieval tavern with peasants in the background, cinematic, 8k, blue volumetric
      //   - Beautiful anime painting of solarpunk summer chill day, by tim okamura, victor nizovtsev, greg rutkowski, noah bradley. trending on artstation, 8k, masterpiece, graffiti paint, fine detail, full of color, intricate detail, golden ratio illustration Steps: 50,

      //   Please come up with a stable diffusion model prompt under 200 words that cover following keywords

      //   The prompt should only have keywords, not a full sentence

      //   - The main character is a woman
      //   - The character need to have makeup that use following colors ${palette.toString()}, please pick the color that suit your needs.
      //   - Pick random country
      //   - The style is realistic human portrait
      //   - Resolution is RAW 8K
      //   - highly detailed
      //   - cinematic lighting
      //   - creative makeup
      // `;

      // setIsGeneratingCharacterDesign(true);
      // const gptCompletion = await openai.createChatCompletion({
      //   model: "gpt-3.5-turbo",
      //   messages: [
      //     {
      //       role: "user",
      //       content,
      //     },
      //   ],
      // });

      // if (gptCompletion.status !== 200) {
      //   setCharacterDesignGenerationError(
      //     "Failed to generate character description"
      //   );
      //   setIsGeneratingCharacterDesign(false);
      //   return;
      // }

      // const characterDesign = gptCompletion.data.choices[0].message.content;

      const characterDesign = `
        ((woman)), (realistic human portrait), (RAW 8K), (highly detailed), 
        (cinematic lighting), (creative makeup), (makeup that use following colors ${palette.toString()}, 
        (creative makeup), (detailed gorgeous face), (breathtaking, vibrant)
      `;

      setCharacterDesign(characterDesign);
      setIsGeneratingCharacterDesign(false);

      // Call HG stable diffusion model to generate image using character description

      console.log("generating makeup image");

      setIsGeneratingMakeupImg(true);
      const generateMakeupImg = await fetch(
        process.env.NEXT_PUBLIC_STABLE_DIFFUSION_API_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inputs: characterDesign }),
        }
      );

      if (!generateMakeupImg.ok) {
        setMakeupImgGenerationError("Failed to generate makeup image");
        setIsGeneratingMakeupImg(false);
        return;
      }

      const makeupImgBlob = await generateMakeupImg.blob();
      setMakeupImg(URL.createObjectURL(makeupImgBlob));
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
                setIsLoadingColors(true);
                const colorThief = new ColorThief();

                // Get the palette from the image, the second argument is the number of colors to return
                const palette = colorThief.getPalette(img.currentTarget, 8);

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
            {characterDesign ? (
              <p className="text-base font-normal px-4 py-2 border rounded-lg">
                {characterDesign}
              </p>
            ) : (
              <span className="px-4 py-2 border rounded-lg h-[42px]">
                {characterDesignGenerationError
                  ? characterDesignGenerationError
                  : isGeneratingCharacterDesign
                  ? "Generating..."
                  : null}
              </span>
            )}
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
