"use client";
import React, { useState } from 'react';
import { X, Upload, FileText, Plus } from 'lucide-react'; // Optional: npm install lucide-react

export default function UploadOverlay() {
    const [isOpen, setIsOpen] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);

            // Validation: Limit to 4 files
            if (selectedFiles.length + files.length > 4) {
                alert("You can only upload a maximum of 4 files.");
                return;
            }
            setFiles((prev) => [...prev, ...selectedFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const uploadAll = async () => {
        setIsUploading(true);
        try {
            // Loop through selected files and hit your existing API
            const uploadPromises = files.map(async (file) => {
                const formData = new FormData();
                formData.append("files", file);

                return fetch("http://127.0.0.1:8000/upload", {
                    method: "POST",
                    body: formData,
                });
            });

            await Promise.all(uploadPromises);
            alert("All files uploaded successfully!");
            setFiles([]);
            setIsOpen(false);
        } catch (error) {
            console.error("Upload failed", error);
            alert("One or more uploads failed.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <>
            {/* 1. The Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all"
            >
                <Plus size={20} /> Add Documents
            </button>

            {/* 2. The Overlay (Modal) */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">

                        {/* Close Button */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X size={24} />
                        </button>

                        <h2 className="text-xl font-bold mb-4">Upload Documents</h2>

                        {/* File Selection Area */}
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center mb-4">
                            <input
                                type="file"
                                multiple
                                onChange={handleFileChange}
                                className="hidden"
                                id="file-input"
                                disabled={files.length >= 4}
                            />
                            <label htmlFor="file-input" className="cursor-pointer">
                                <Upload className="mx-auto mb-2 text-blue-500" size={32} />
                                <p className="text-sm font-medium text-gray-700">
                                    {files.length >= 4 ? "Limit reached" : "Click to select files"}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">Up to 4 files (PDF, TXT)</p>
                            </label>
                        </div>

                        {/* Selected Files List */}
                        <div className="space-y-2 mb-6">
                            {files.map((file, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <FileText size={16} className="text-blue-500 flex-shrink-0" />
                                        <span className="text-sm truncate text-gray-600">{file.name}</span>
                                    </div>
                                    <button onClick={() => removeFile(index)} className="text-red-400 hover:text-red-600">
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={uploadAll}
                                disabled={files.length === 0 || isUploading}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                            >
                                {isUploading ? "Uploading..." : `Upload ${files.length} Files`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}