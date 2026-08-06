import { NextRequest, NextResponse } from 'next/server';

// Mock database
let products: any[] = [
  {
    id: '1',
    name: 'Premium Titanium Cup',
    description: 'High-quality titanium cup with superior heat resistance and durability.',
    imageUrl: '/products/cup-1.jpg',
    vrImageUrl: '/products/cup-1-vr.jpg',
    price: 49.99,
    specifications: 'Material: Aircraft-grade Titanium\nCapacity: 500ml\nWeight: 150g\nTemperature Range: -50°C to 200°C',
  },
  {
    id: '2',
    name: 'Deluxe Titanium Mug',
    description: 'Premium mug with ergonomic handle and double-wall insulation.',
    imageUrl: '/products/mug-1.jpg',
    price: 59.99,
    specifications: 'Material: Pure Titanium\nCapacity: 350ml\nInsulation: Double-wall\nHandle: Ergonomic',
  },
  {
    id: '3',
    name: '3D钛杯模型',
    description: '高精度3D扫描钛杯模型，支持在线360度旋转查看。采用PBR材质渲染，真实展现钛金属质感。',
    imageUrl: '/products/model/person-cup/texture_pbr_20250901.png',
    model3dUrl: '/products/model/person-cup/1fc6efad408e0e29cd41b44a8aa88efc.obj',
    price: 79.99,
    specifications: '材质: 航空级钛合金\n工艺: 精密3D扫描\n渲染: PBR物理材质\n贴图: 4K高清PBR贴图',
  },
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;
  const product = products.find(p => p.id === productId);
  
  if (!product) {
    return NextResponse.json(
      { error: 'Product not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    product,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;
  const index = products.findIndex(p => p.id === productId);
  
  if (index === -1) {
    return NextResponse.json(
      { error: 'Product not found' },
      { status: 404 }
    );
  }
  
  const deletedProduct = products.splice(index, 1)[0];
  
  return NextResponse.json({
    message: 'Product deleted',
    product: deletedProduct,
  });
}
