'use client';

import { useState, useEffect } from 'react';
import FileUpload from '@/components/FileUpload';
import Navbar from '@/components/Navbar';
import ChineseBackground from '@/components/ChineseBackground';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  vrImageUrl?: string;
  price?: number;
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    specifications: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProductImageUpload = async (file: File) => {
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('type', 'product');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: uploadFormData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data = await response.json();
    setFormData((prev) => ({
      ...prev,
      productImageUrl: data.url,
    }));
  };

  const handleVRImageUpload = async (file: File) => {
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('type', 'vr');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: uploadFormData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data = await response.json();
    setFormData((prev) => ({
      ...prev,
      vrImageUrl: data.url,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price) || 0,
          specifications: formData.specifications,
          imageUrl: (formData as any).productImageUrl || '/placeholder.jpg',
          vrImageUrl: (formData as any).vrImageUrl,
        }),
      });

      if (response.ok) {
        setFormData({
          name: '',
          description: '',
          price: '',
          specifications: '',
        });
        (formData as any).productImageUrl = undefined;
        (formData as any).vrImageUrl = undefined;
        fetchProducts();
        alert('Product created successfully!');
      }
    } catch (error) {
      alert('Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await fetch(`/api/products/${id}`, {
          method: 'DELETE',
        });
        fetchProducts();
      } catch (error) {
        console.error('Failed to delete product:', error);
      }
    }
  };

  return (
    <main className="min-h-screen">
      <ChineseBackground />
      <Navbar />

      {/* Admin Panel */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white mb-12">管理面板</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Product Form */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6">添加新产品</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    产品名称 *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入产品名称"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    产品描述 *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入产品描述"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    价格 (CNY)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入价格"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    规格参数
                  </label>
                  <textarea
                    name="specifications"
                    value={formData.specifications}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入产品规格"
                  />
                </div>

                <div>
                  <FileUpload
                    onUpload={handleProductImageUpload}
                    label="Product Image *"
                    accept="image/*"
                  />
                  {(formData as any).productImageUrl && (
                    <p className="text-sm text-green-600 mt-2">Image uploaded ✓</p>
                  )}
                </div>

                <div>
                  <FileUpload
                    onUpload={handleVRImageUpload}
                    label="VR Panorama Image (Optional)"
                    accept="image/*"
                  />
                  {(formData as any).vrImageUrl && (
                    <p className="text-sm text-green-600 mt-2">VR image uploaded ✓</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 rounded-xl font-semibold hover:from-blue-400 hover:to-blue-500 transition-all disabled:opacity-50"
                >
                  {loading ? '创建中...' : '创建产品'}
                </button>
              </form>
            </div>
          </div>

          {/* Products List */}
          <div>
            <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6">产品列表 ({products.length})</h2>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {products.map((product) => (
                  <div key={product.id} className="border border-white/10 p-4 rounded-xl bg-white/[0.03]">
                    <h3 className="font-semibold text-white mb-2">{product.name}</h3>
                    {product.price && (
                      <p className="text-sm text-blue-400 mb-2">¥{product.price.toFixed(2)}</p>
                    )}
                    {product.vrImageUrl && (
                      <span className="inline-block bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold px-2 py-1 rounded mb-2">
                        VR 360°
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="w-full text-red-400 text-sm hover:text-red-300 font-medium"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
