import { useRef, useEffect } from "react";
import { Button } from "./button";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  function exec(command: string, arg?: string) {
    document.execCommand(command, false, arg);
    onChange(ref.current?.innerHTML || "");
  }

  return (
    <div className="space-y-2">
      <div className="space-x-1">
        <Button type="button" variant="outline" size="sm" onClick={() => exec("bold")}>B</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => exec("italic")}>I</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => exec("underline")}>U</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => exec("formatBlock", "h3")}>H3</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => exec("formatBlock", "p")}>P</Button>
      </div>
      <div
        ref={ref}
        contentEditable
        onInput={() => onChange(ref.current?.innerHTML || "")}
        className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </div>
  );
}

