export type EngineMode = "local" | "cloud";

export type ModelStage =
  | "idle"
  | "detecting"
  | "loading-editor"
  | "loading-generator"
  | "ready"
  | "error";

export type ProgressEvent = {
  stage: ModelStage;
  progress: number; // 0-100
  message: string;
  file?: string;
};

export type Caps = {
  webgpu: boolean;
  wasm: boolean;
};

export type GenerateRequest = {
  type: "generate";
  prompt: string;
  seed?: number;
};

export type EditRequest = {
  type: "edit";
  prompt: string;
  imageDataUrl: string;
};

export type LoadRequest = {
  type: "load";
  wantGenerator: boolean;
};

export type WorkerIn = LoadRequest | GenerateRequest | EditRequest | { type: "detect" };

export type WorkerOut =
  | { type: "progress"; data: ProgressEvent }
  | { type: "caps"; data: Caps }
  | { type: "ready"; data: { editor: boolean; generator: boolean; caps: Caps } }
  | { type: "result"; data: { imageDataUrl: string; meta: string } }
  | { type: "error"; data: { message: string } };
