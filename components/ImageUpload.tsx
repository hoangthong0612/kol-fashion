import React, { useRef } from 'react';

interface ImageUploadProps {
  label: string;
  imagePreviews: string[];
  onImageChange: (files: File[]) => void;
  required?: boolean;
  multiple?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ label, imagePreviews, onImageChange, required, multiple }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (multiple) {
        // If multiple, we append typically, but here we just pass the new list from this selection
        // In a real app, you might want to merge, but simple replacement or accumulation logic belongs in parent.
        // For this component, let's assume it passes what was selected this time.
        // To support "adding", the parent needs to handle the merge. 
        // Let's Convert FileList to Array
        const files = Array.from(e.target.files);
        onImageChange(files); 
      } else {
        onImageChange([e.target.files[0]]);
      }
    }
  };

  const handleRemove = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    // This component relies on parent to manage state, so we need a way to signal removal.
    // However, the props interface `onImageChange` expects files.
    // To keep it simple without changing props interface too much:
    // We will handle removal in the Parent component by passing a "Remove" callback ideally, 
    // but here we can't easily emit a new FileList.
    // Let's strictly use this for uploading. 
    // NOTE: For better UX, we'll modify the parent to handle removal, 
    // but here we will just trigger input.
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <label className="text-sm uppercase tracking-widest text-stone-400 font-semibold">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {multiple && imagePreviews.length > 0 && (
          <span className="text-xs text-stone-500">{imagePreviews.length} ảnh đã chọn</span>
        )}
      </div>
      
      {/* Upload Area */}
      <div 
        onClick={() => inputRef.current?.click()}
        className={`
          relative w-full border-2 border-dashed transition-all cursor-pointer group overflow-hidden
          ${imagePreviews.length > 0 ? 'border-stone-700 hover:border-stone-500 h-32' : 'border-stone-700 hover:border-stone-500 bg-stone-900 aspect-[3/4]'}
        `}
      >
        <input 
          ref={inputRef}
          type="file" 
          accept="image/*" 
          onChange={handleFileChange}
          className="hidden" 
          multiple={multiple}
        />
        
        <div className="flex flex-col items-center justify-center h-full text-stone-500 gap-2 p-4 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <span className="text-xs uppercase tracking-wide">{multiple ? "Upload Nhiều Ảnh" : "Upload Ảnh"}</span>
        </div>
      </div>

      {/* Grid for Previews */}
      {imagePreviews.length > 0 && (
        <div className={`grid ${multiple ? 'grid-cols-3' : 'grid-cols-1'} gap-2`}>
          {imagePreviews.map((src, idx) => (
            <div key={idx} className="relative aspect-[3/4] border border-stone-800 bg-stone-900 group">
              <img 
                src={src} 
                alt={`Preview ${idx}`} 
                className="w-full h-full object-cover" 
              />
              {/* Only allow removing if we passed a remove handler, but for now we rely on re-upload or parent logic. 
                  Since we didn't add onRemove to props, we'll keep it simple: Click 'X' to re-trigger parent removal logic 
                  if we were to implement it. For now, visual feedback only. */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};