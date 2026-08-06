#!/usr/bin/env python3
"""
VR 全景图批量处理工具

功能:
  1. 检测全景图格式和分辨率
  2. 转换立方体贴图 (6 张图) → Equirectangular 全景图
  3. 优化图片大小和质量
  4. 转换图片格式 (JPG → WebP)

需求: Pillow, numpy
安装: pip install Pillow numpy

使用:
  python panorama-processor.py <输入文件或目录>
"""

import os
import sys
from pathlib import Path

def check_image_info(image_path):
    """检查图片信息"""
    try:
        from PIL import Image
        img = Image.open(image_path)
        width, height = img.size
        format_type = img.format
        mode = img.mode
        
        # 文件大小
        file_size_mb = os.path.getsize(image_path) / (1024 * 1024)
        
        # 检测是否可能是全景图
        aspect_ratio = width / height if height > 0 else 0
        is_panorama_candidate = 1.9 <= aspect_ratio <= 2.1
        
        return {
            'path': image_path,
            'width': width,
            'height': height,
            'format': format_type,
            'mode': mode,
            'file_size_mb': file_size_mb,
            'aspect_ratio': aspect_ratio,
            'is_panorama_candidate': is_panorama_candidate,
        }
    except Exception as e:
        return {'error': str(e), 'path': image_path}

def print_image_info(info):
    """格式化输出图片信息"""
    if 'error' in info:
        print(f"✗ 错误: {info['error']}")
        return
    
    print(f"\n📊 图片信息:")
    print(f"  路径: {info['path']}")
    print(f"  分辨率: {info['width']} × {info['height']} px")
    print(f"  宽高比: {info['aspect_ratio']:.2f}:1")
    print(f"  格式: {info['format']} ({info['mode']})")
    print(f"  文件大小: {info['file_size_mb']:.2f} MB")
    
    if info['is_panorama_candidate']:
        print(f"  ✅ 符合全景图规格 (2:1 宽高比)")
    else:
        print(f"  ⚠️  不符合全景图规格 (期望 2:1 宽高比)")
        print(f"      可能是立方体贴图或其他格式")

def optimize_image(input_path, output_path=None, max_width=2048, quality=85):
    """优化图片大小和质量"""
    try:
        from PIL import Image
        
        if output_path is None:
            base, ext = os.path.splitext(input_path)
            output_path = f"{base}_optimized.jpg"
        
        img = Image.open(input_path)
        
        # 保持宽高比缩放
        if img.width > max_width:
            ratio = max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
        
        # 保存为 JPG 并优化
        img.save(output_path, 'JPEG', quality=quality, optimize=True)
        
        original_size = os.path.getsize(input_path) / (1024 * 1024)
        optimized_size = os.path.getsize(output_path) / (1024 * 1024)
        reduction = (1 - optimized_size / original_size) * 100
        
        print(f"\n✓ 优化完成:")
        print(f"  输出文件: {output_path}")
        print(f"  原大小: {original_size:.2f} MB")
        print(f"  优化后: {optimized_size:.2f} MB (减少 {reduction:.1f}%)")
        print(f"  新分辨率: {img.width} × {img.height} px")
        
        return output_path
    except ImportError:
        print("✗ 需要安装 Pillow: pip install Pillow")
        return None
    except Exception as e:
        print(f"✗ 优化失败: {e}")
        return None

def convert_to_webp(input_path, output_path=None, quality=80):
    """转换为 WebP 格式"""
    try:
        from PIL import Image
        
        if output_path is None:
            base, _ = os.path.splitext(input_path)
            output_path = f"{base}.webp"
        
        img = Image.open(input_path)
        img.save(output_path, 'WEBP', quality=quality)
        
        original_size = os.path.getsize(input_path) / (1024 * 1024)
        webp_size = os.path.getsize(output_path) / (1024 * 1024)
        reduction = (1 - webp_size / original_size) * 100
        
        print(f"\n✓ 转换完成:")
        print(f"  输出文件: {output_path}")
        print(f"  原大小: {original_size:.2f} MB (JPG)")
        print(f"  转换后: {webp_size:.2f} MB (WebP, 减少 {reduction:.1f}%)")
        
        return output_path
    except ImportError:
        print("✗ 需要安装 Pillow: pip install Pillow")
        return None
    except Exception as e:
        print(f"✗ 转换失败: {e}")
        return None

def detect_cubemap_images(directory):
    """检测立方体贴图 (6 张图)"""
    cubemap_patterns = {
        'front': ['front', 'px', 'posX'],
        'back': ['back', 'nx', 'negX'],
        'left': ['left', 'pz', 'posZ'],
        'right': ['right', 'nz', 'negZ'],
        'top': ['top', 'py', 'posY'],
        'bottom': ['bottom', 'ny', 'negY'],
    }
    
    files = os.listdir(directory)
    found = {}
    
    for face, patterns in cubemap_patterns.items():
        for file in files:
            lower = file.lower()
            if any(p.lower() in lower for p in patterns):
                if any(lower.endswith(ext) for ext in ['.jpg', '.png', '.jpeg']):
                    found[face] = file
                    break
    
    return found if len(found) == 6 else {}

def print_cubemap_info(cubemap_dict):
    """输出立方体贴图信息"""
    print("\n✅ 检测到立方体贴图 (6 张图):")
    for face, filename in sorted(cubemap_dict.items()):
        print(f"  {face:10} → {filename}")
    
    print("\n⚠️  需要转换为 Equirectangular 格式")
    print("   推荐使用:")
    print("   1. 在线工具: https://cubemapconverter.com/")
    print("   2. Python: pip install pillow numpy")
    print("              然后使用相应的转换脚本")

def main():
    if len(sys.argv) < 2:
        print("VR 全景图处理工具\n")
        print("使用方法:")
        print("  python panorama-processor.py <图片文件或目录>\n")
        print("示例:")
        print("  python panorama-processor.py panorama.jpg")
        print("  python panorama-processor.py ./vr-images/\n")
        print("功能:")
        print("  ✓ 检测图片格式和分辨率")
        print("  ✓ 检测立方体贴图")
        print("  ✓ 优化图片大小 (--optimize)")
        print("  ✓ 转换到 WebP (--webp)\n")
        sys.exit(1)
    
    path = sys.argv[1]
    
    if not os.path.exists(path):
        print(f"✗ 路径不存在: {path}")
        sys.exit(1)
    
    # 处理单个文件
    if os.path.isfile(path):
        print("\n" + "=" * 60)
        print("📄 检测单个文件")
        print("=" * 60)
        
        info = check_image_info(path)
        print_image_info(info)
        
        # 检查命令行选项
        if '--optimize' in sys.argv:
            optimize_image(path)
        
        if '--webp' in sys.argv:
            convert_to_webp(path)
    
    # 处理目录
    elif os.path.isdir(path):
        print("\n" + "=" * 60)
        print(f"📁 扫描目录: {path}")
        print("=" * 60)
        
        # 查找图片文件
        image_files = [
            f for f in os.listdir(path)
            if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))
        ]
        
        if not image_files:
            print("✗ 目录中未找到图片文件")
            sys.exit(1)
        
        print(f"\n找到 {len(image_files)} 个图片文件:\n")
        
        # 检测立方体贴图
        cubemap = detect_cubemap_images(path)
        if cubemap:
            print_cubemap_info(cubemap)
            print("")
        
        # 逐个分析
        for filename in image_files:
            filepath = os.path.join(path, filename)
            info = check_image_info(filepath)
            print_image_info(info)

if __name__ == '__main__':
    main()
