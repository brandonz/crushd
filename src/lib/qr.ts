import QRCode from "qrcode";

export async function generateQRSVG(shortCode: string): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://crushd.app";
  const url = `${appUrl}/r/${shortCode}`;
  return QRCode.toString(url, { type: "svg", margin: 2, width: 256 });
}

export async function generateQRDataURL(shortCode: string): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://crushd.app";
  const url = `${appUrl}/r/${shortCode}`;
  return QRCode.toDataURL(url, { margin: 2, width: 256 });
}
