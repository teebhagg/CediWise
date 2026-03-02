"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

interface RichEmailEditorProps {
  value: string;
  onChange: (html: string, text: string) => void;
  className?: string;
}

export function RichEmailEditor({ value, onChange, className }: RichEmailEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none dark:prose-invert min-h-[220px] rounded-xl border border-input bg-background px-3 py-3 text-sm leading-6 focus-visible:outline-none [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_blockquote]:border-l [&_blockquote]:border-muted-foreground/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold",
      },
    },
    onUpdate: ({ editor: next }) => {
      onChange(next.getHTML(), next.getText({ blockSeparator: "\n" }));
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "<p></p>", false);
    }
  }, [editor, value]);

  if (!editor) return null;

  function onToolbarAction(e: React.MouseEvent, run: () => void) {
    e.preventDefault();
    run();
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 p-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={(e) => onToolbarAction(e, () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        >
          H2
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={(e) => onToolbarAction(e, () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
        >
          H3
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={(e) => onToolbarAction(e, () => editor.chain().focus().toggleBold().run())}
        >
          Bold
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={(e) => onToolbarAction(e, () => editor.chain().focus().toggleItalic().run())}
        >
          Italic
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={(e) => onToolbarAction(e, () => editor.chain().focus().toggleUnderline().run())}
        >
          Underline
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={(e) => onToolbarAction(e, () => editor.chain().focus().toggleBulletList().run())}
        >
          Bullet
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={(e) => onToolbarAction(e, () => editor.chain().focus().toggleOrderedList().run())}
        >
          Numbered
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={(e) => onToolbarAction(e, () => editor.chain().focus().toggleBlockquote().run())}
        >
          Quote
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            const current = editor.getAttributes("link").href as string | undefined;
            const input = window.prompt("Enter HTTPS URL", current || "https://");
            if (!input) return;
            if (!input.startsWith("https://")) return;
            editor.chain().focus().setLink({ href: input }).run();
          }}
        >
          Link
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={(e) => onToolbarAction(e, () => editor.chain().focus().unsetLink().run())}
        >
          Unlink
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
