import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Upload, ImageIcon, FileDown, Trash2, Copy, Check, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface GuideAsset {
  id: number;
  name: string;
  label: string;
  description?: string | null;
  objectPath: string;
  contentType: string;
  size?: number | null;
  assetType: string;
  uploadedAt: string;
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadCard({
  assetType,
  accept,
  icon: Icon,
  title,
  subtitle,
  onUploaded,
}: {
  assetType: "file" | "image";
  accept: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onUploaded: () => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSelectedFile(f);
    if (!label) setLabel(f.name.replace(/\.[^/.]+$/, ""));
    if (assetType === "image") {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !label.trim()) {
      toast({ title: "Please select a file and enter a label", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedFile.name,
          size: selectedFile.size,
          contentType: selectedFile.type,
        }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();

      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });
      if (!putRes.ok) throw new Error("Upload to storage failed");

      await fetch("/api/guide-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedFile.name,
          label: label.trim(),
          description: description.trim() || null,
          objectPath,
          contentType: selectedFile.type,
          size: selectedFile.size,
          assetType,
        }),
      });

      toast({ title: "Uploaded successfully" });
      setSelectedFile(null);
      setLabel("");
      setDescription("");
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      onUploaded();
    } catch (err: unknown) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-orange-100 rounded-xl p-5 bg-white space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-900">{title}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>

      <div
        className="border-2 border-dashed border-orange-200 rounded-lg p-6 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="preview" className="max-h-32 mx-auto rounded object-contain" />
        ) : (
          <>
            <Upload className="w-8 h-8 text-orange-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Click to select a file</p>
            <p className="text-xs text-gray-400 mt-1">{accept.replace(/\./g, "").toUpperCase()}</p>
          </>
        )}
        {selectedFile && (
          <p className="text-xs text-orange-600 mt-2 font-medium">
            {selectedFile.name} ({formatBytes(selectedFile.size)})
          </p>
        )}
      </div>
      <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={handleFileChange} />

      <div className="space-y-2">
        <div>
          <Label className="text-xs text-gray-600">Label *</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Starter Pine Script"
            className="mt-1 h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">Description (optional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description shown to users"
            className="mt-1 text-sm resize-none"
            rows={2}
          />
        </div>
      </div>

      <Button
        onClick={handleUpload}
        disabled={uploading || !selectedFile}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white"
      >
        {uploading ? "Uploading…" : "Upload"}
      </Button>
    </div>
  );
}

function CopyPathButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const sym = `[DOWNLOAD:${path}|Download]`;
    navigator.clipboard.writeText(sym);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      title="Copy guide symbol"
      className="text-gray-400 hover:text-orange-500 transition-colors"
    >
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function CopyImgButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const sym = `[IMG:${path}|Screenshot]`;
    navigator.clipboard.writeText(sym);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      title="Copy image symbol"
      className="text-gray-400 hover:text-orange-500 transition-colors"
    >
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function AssetRow({
  asset,
  onDelete,
}: {
  asset: GuideAsset;
  onDelete: (id: number) => void;
}) {
  const downloadUrl = `/api/storage/objects${asset.objectPath}`;
  const isImage = asset.assetType === "image";

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-orange-100 hover:bg-orange-50/30 transition-colors group">
      <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {isImage ? (
          <img src={downloadUrl} alt={asset.label} className="w-9 h-9 object-cover rounded-lg" />
        ) : (
          <FileDown className="w-5 h-5 text-orange-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{asset.label}</p>
        {asset.description && (
          <p className="text-xs text-gray-500 truncate">{asset.description}</p>
        )}
        <p className="text-xs text-gray-400">
          {asset.name} {asset.size ? `· ${formatBytes(asset.size)}` : ""} ·{" "}
          {formatDistanceToNow(new Date(asset.uploadedAt), { addSuffix: true })}
        </p>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Badge variant="outline" className="text-xs text-gray-500">
          {isImage ? "image" : "file"}
        </Badge>
        {isImage ? (
          <CopyImgButton path={asset.objectPath} />
        ) : (
          <CopyPathButton path={asset.objectPath} />
        )}
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Download"
          className="text-gray-400 hover:text-orange-500 transition-colors"
        >
          <FileDown className="w-4 h-4" />
        </a>
        <button
          onClick={() => onDelete(asset.id)}
          title="Delete"
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function Guides() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: assets = [], isLoading } = useQuery<GuideAsset[]>({
    queryKey: ["/api/guide-assets"],
    queryFn: () => fetch("/api/guide-assets").then((r) => r.json()),
    refetchInterval: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/guide-assets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guide-assets"] });
      toast({ title: "Asset deleted" });
    },
  });

  const files = assets.filter((a) => a.assetType === "file");
  const images = assets.filter((a) => a.assetType === "image");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/guide-assets"] });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-orange-500" />
              <h1 className="text-lg font-bold text-gray-900">Guide Assets</h1>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            {assets.length} asset{assets.length !== 1 ? "s" : ""} uploaded
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Upload panels */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Upload New Asset</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <UploadCard
              assetType="file"
              accept=".pdf,.zip,.txt,.md,.py,.ts,.json,.csv,.xlsx,.docx"
              icon={FileDown}
              title="Downloadable File"
              subtitle="PDFs, ZIPs, code files, spreadsheets"
              onUploaded={refresh}
            />
            <UploadCard
              assetType="image"
              accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
              icon={ImageIcon}
              title="Screenshot / Image"
              subtitle="PNGs, JPEGs, GIFs for embedding in guides"
              onUploaded={refresh}
            />
          </div>
        </div>

        {/* Symbol key hint */}
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">Using assets in your guides</p>
          <p className="text-xs text-blue-600">
            Hover any asset and click the{" "}
            <Copy className="inline w-3 h-3" /> copy icon to get the guide symbol. Paste it into your
            guide file:
          </p>
          <div className="mt-2 flex flex-col gap-1">
            <code className="text-xs bg-blue-100 rounded px-2 py-1">
              [IMG:/objects/abc123|Screenshot of TradingView alert setup]
            </code>
            <code className="text-xs bg-blue-100 rounded px-2 py-1">
              [DOWNLOAD:/objects/abc123|Download Starter Pine Script]
            </code>
          </div>
        </div>

        {/* Downloadable files */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Downloadable Files
            <span className="ml-2 text-sm font-normal text-gray-400">({files.length})</span>
          </h2>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : files.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
              <FileDown className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No downloadable files yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((a) => (
                <AssetRow key={a.id} asset={a} onDelete={(id) => deleteMutation.mutate(id)} />
              ))}
            </div>
          )}
        </div>

        {/* Screenshots */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Screenshots &amp; Images
            <span className="ml-2 text-sm font-normal text-gray-400">({images.length})</span>
          </h2>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : images.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
              <ImageIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No images uploaded yet</p>
            </div>
          ) : (
            <>
              {/* Grid preview */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                {images.map((a) => (
                  <a
                    key={a.id}
                    href={`/api/storage/objects${a.objectPath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-video rounded-lg overflow-hidden border border-gray-100 hover:border-orange-200 transition-colors bg-gray-50"
                  >
                    <img
                      src={`/api/storage/objects${a.objectPath}`}
                      alt={a.label}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <p className="text-white text-xs font-medium truncate">{a.label}</p>
                    </div>
                  </a>
                ))}
              </div>
              {/* List view */}
              <div className="space-y-2">
                {images.map((a) => (
                  <AssetRow key={a.id} asset={a} onDelete={(id) => deleteMutation.mutate(id)} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
