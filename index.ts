import Enquirer from "enquirer";
import fs from "fs";
import path from "path";
import axios from "axios";

// @ts-ignore
const { Input, Select, Confirm } = Enquirer;

if (!process.env.HOME) throw new Error("HOME environment variable is not set");

const appsDir = path.join(process.env.HOME, ".local/share/applications");
const iconsDir = path.join(process.env.HOME, ".local/share/icons/webapps");

// Ensure directories exist
if (!fs.existsSync(appsDir)) fs.mkdirSync(appsDir, { recursive: true });
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// Download icon from URL
async function downloadIcon(url: string, name: string) {
  const iconPath = path.join(iconsDir, `${name}.png`);
  const response = await axios.get(url, { responseType: "arraybuffer" });
  fs.writeFileSync(iconPath, response.data);
  return iconPath;
}

// Check for collisions
function checkCollision(name: string) {
  const filePath = path.join(appsDir, `${name}.web.desktop`);
  return fs.existsSync(filePath);
}

async function createWebApp() {
  let name = await new Input({ name: "name", message: "App Name:" }).run();

  if (checkCollision(name)) {
    console.log(`❌ A web app with the name "${name}" already exists. Pick a different name.`);
    return;
  }

  const url = await new Input({ name: "url", message: "App URL:" }).run();
  const iconUrl = await new Input({ name: "icon", message: "Icon URL (PNG recommended):" }).run();

  const iconPath = await downloadIcon(iconUrl, name);

  const desktopFile = `[Desktop Entry]
Name=${name}
Exec=chromium-browser --app=${url}
Icon=${iconPath}
Terminal=false
Type=Application
Categories=Utility;
`;

  fs.writeFileSync(path.join(appsDir, `${name}.web.desktop`), desktopFile);
  console.log(`✨ Created web app "${name}" with downloaded icon!`);
}

async function deleteWebApp() {
  const files = fs.readdirSync(appsDir).filter(f => f.endsWith(".web.desktop"));
  if (!files.length) return console.log("No web apps found 😢");

  const toDelete = await new Select({
    name: "toDelete",
    message: "Select app to delete:",
    choices: files
  }).run();

  const confirmDelete = await new Confirm({
    name: "confirm",
    message: `Are you sure you want to delete "${toDelete}"?`
  }).run();

  if (!confirmDelete) return;

  fs.unlinkSync(path.join(appsDir, toDelete));
  const iconFile = path.join(iconsDir, toDelete.replace(".web.desktop", ".png"));
  if (fs.existsSync(iconFile)) fs.unlinkSync(iconFile);

  console.log(`🗑️ Deleted "${toDelete}"`);
}

function listWebApps() {
  const files = fs.readdirSync(appsDir).filter(f => f.endsWith(".web.desktop"));
  if (!files.length) return console.log("No web apps found 😢");

  console.log("📦 Your web apps:");
  files.forEach(f => console.log(" -", f.replace(".web.desktop", "")));
}

async function main() {
  const action = await new Select({
    name: "action",
    message: "What do you want to do?",
    choices: ["Create Web App", "Delete Web App", "List Web Apps", "Quit"]
  }).run();

  if (action === "Quit") return;

  if (action === "Create Web App") await createWebApp();
  if (action === "Delete Web App") await deleteWebApp();
  if (action === "List Web Apps") listWebApps();

  main(); // loop
}

main();

