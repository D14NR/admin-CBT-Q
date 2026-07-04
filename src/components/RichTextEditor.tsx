import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Bold, Italic, List, ListOrdered, Heading2, ImagePlus, Plus, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { uploadImageToCloudinary } from '@/cloudinary';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onImageUpload?: (url: string) => void;
}

function ResizableImage({ node, selected, updateAttributes }: any) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const resizing = useRef(false);

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const onPointerMove = (event: PointerEvent) => {
    if (!resizing.current) return;
    const delta = event.clientX - startX.current;
    const newWidth = Math.max(50, startWidth.current + delta);
    updateAttributes({ width: `${newWidth}px` });
  };

  const onPointerUp = () => {
    if (!resizing.current) return;
    resizing.current = false;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    resizing.current = true;
    startX.current = event.clientX;
    const rect = wrapperRef.current?.getBoundingClientRect();
    startWidth.current = rect?.width ?? 0;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const setFloat = (value: 'left' | 'right' | null) => {
    updateAttributes({ float: value });
  };

  return (
    <NodeViewWrapper ref={wrapperRef} className={selected ? 'relative inline-flex outline outline-2 outline-blue-500' : 'relative inline-flex'}>
      <img
        src={node.attrs.src}
        alt={node.attrs.alt || ''}
        style={{
          width: node.attrs.width || 'auto',
          height: node.attrs.height || 'auto',
          display: 'block',
          maxWidth: '100%',
          float: node.attrs.float || 'none',
        }}
        draggable={true}
      />
      {selected && (
        <>
          <div className="absolute top-0 right-0 flex gap-1 p-1 z-10">
            <button
              type="button"
              onClick={() => setFloat('left')}
              className="px-2 py-1 text-[11px] font-semibold text-white bg-blue-600 rounded"
            >
              L
            </button>
            <button
              type="button"
              onClick={() => setFloat('right')}
              className="px-2 py-1 text-[11px] font-semibold text-white bg-blue-600 rounded"
            >
              R
            </button>
            <button
              type="button"
              onClick={() => setFloat(null)}
              className="px-2 py-1 text-[11px] font-semibold text-gray-700 bg-white border border-gray-300 rounded"
            >
              N
            </button>
          </div>
          <div
            className="absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2 w-7 h-7 bg-white border-2 border-blue-600 rounded-full shadow-lg cursor-se-resize flex items-center justify-center"
            onPointerDown={startResize}
          >
            <div className="w-2 h-2 bg-blue-600 rounded-full" />
          </div>
        </>
      )}
    </NodeViewWrapper>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Tulis pertanyaan di sini...',
  onImageUpload,
}: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [formulaInput, setFormulaInput] = useState('');
  const [showFormulaInput, setShowFormulaInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.extend({
        addAttributes() {
          return {
            ...(this.parent ? this.parent() : {}),
            width: {
              default: null,
            },
            height: {
              default: null,
            },
            float: {
              default: null,
            },
          };
        },
        addNodeView() {
          return ReactNodeViewRenderer(ResizableImage);
        },
      }).configure({
        allowBase64: true,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    setUploading(true);
    try {
      const result = await uploadImageToCloudinary(file);
      if (!result || !result.secure_url) {
        throw new Error('Upload gagal: tidak ada URL gambar');
      }
      const url = result.secure_url;
      editor.chain().focus().setImage({ src: url }).run();
      onChange(editor.getHTML());
      if (onImageUpload) onImageUpload(url);
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Gagal mengunggah gambar');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const insertFormula = () => {
    if (!formulaInput.trim() || !editor) return;
    
    // Insert formula as text wrapped in $ for inline or $$ for display
    const latex = `<span class="formula" data-latex="${formulaInput}">$${formulaInput}$</span>`;
    editor.chain().focus().insertContent(latex).run();
    setFormulaInput('');
    setShowFormulaInput(false);
    onChange(editor.getHTML());
  };

  if (!editor) return null;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 bg-gray-50 border-b border-gray-200 p-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-300' : ''}`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-300' : ''}`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </button>

        <div className="border-l border-gray-300"></div>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : ''}`}
          title="Heading"
        >
          <Heading2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-300' : ''}`}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-300' : ''}`}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <div className="border-l border-gray-300"></div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-2 rounded hover:bg-gray-200 disabled:opacity-50"
          title="Insert Image"
        >
          <ImagePlus className="h-4 w-4" />
        </button>


        <button
          type="button"
          onClick={() => setShowFormulaInput(!showFormulaInput)}
          className="p-2 rounded hover:bg-gray-200 text-sm font-mono border border-gray-300"
          title="Insert Formula (LaTeX)"
        >
          ∑x
        </button>
      </div>


        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

      {/* Formula Input */}
      {showFormulaInput && (
        <div className="border-b border-gray-200 p-3 bg-blue-50 flex gap-2 items-center">
          <input
            type="text"
            value={formulaInput}
            onChange={(e) => setFormulaInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') insertFormula();
              if (e.key === 'Escape') {
                setShowFormulaInput(false);
                setFormulaInput('');
              }
            }}
            placeholder="Contoh: x^2 + y^2 = z^2 atau \frac{a}{b}"
            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
            autoFocus
          />
          <button
            type="button"
            onClick={insertFormula}
            className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowFormulaInput(false);
              setFormulaInput('');
            }}
            className="p-2 hover:bg-gray-200 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[20px] max-h-[180px] overflow-y-auto focus:outline-none [&_.formula]:bg-yellow-100 [&_.formula]:px-1 [&_.formula]:rounded [&_img]:max-w-full [&_img]:h-auto"
      />

      {/* Loading Indicator */}
      {uploading && (
        <div className="border-t border-gray-200 px-4 py-2 bg-blue-50 text-sm text-blue-600">
          Mengunggah gambar...
        </div>
      )}
    </div>
  );
}
