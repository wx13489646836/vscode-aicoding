#!/usr/bin/env python3
"""
VR 产品图集成脚本

使用方法:
  1. 解压 ZIP 文件，取出全景图
  2. 运行: python setup-vr-images.py <全景图路径>
     或直接放在项目根目录运行: python setup-vr-images.py

支持的格式: JPG, PNG, WebP, JPEG
"""

import os
import sys
import shutil
from pathlib import Path

# 颜色代码
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    RESET = '\033[0m'

def print_colored(color, *args):
    """带颜色输出"""
    print(f"{color}{' '.join(map(str, args))}{Colors.RESET}")

def get_project_paths():
    """获取项目路径"""
    project_root = Path(__file__).parent.resolve()
    public_dir = project_root / 'public'
    vr_dir = public_dir / 'products' / 'vr-panoramas'
    page_file = project_root / 'src' / 'app' / 'page.tsx'
    
    return {
        'project_root': project_root,
        'public_dir': public_dir,
        'vr_dir': vr_dir,
        'page_file': page_file,
    }

def find_panorama_image(search_dir):
    """在目录中搜索全景图"""
    patterns = [
        'titanium-cup-360',
        'titanium-cup',
        'vr-panorama',
        'panorama',
        '360-panorama',
        'equirectangular',
    ]
    
    extensions = ['.jpg', '.jpeg', '.png', '.webp']
    
    if not os.path.exists(search_dir):
        return None
    
    files = os.listdir(search_dir)
    
    # 精确匹配
    for pattern in patterns:
        for ext in extensions:
            filename = pattern + ext
            if filename in files:
                return os.path.join(search_dir, filename)
    
    # 模糊匹配
    for file in files:
        lower = file.lower()
        if any(x in lower for x in ['panorama', '360', 'equirect']):
            if any(lower.endswith(ext) for ext in extensions):
                return os.path.join(search_dir, file)
    
    return None

def get_image_size(image_path):
    """获取文件大小"""
    try:
        size_bytes = os.path.getsize(image_path)
        size_mb = size_bytes / (1024 * 1024)
        return f"{size_mb:.2f} MB"
    except:
        return "unknown size"

def update_page_file(image_path, page_file, public_dir):
    """更新 page.tsx 中的 vrImage 路径"""
    try:
        with open(page_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 计算相对路径
        rel_path = os.path.relpath(image_path, public_dir)
        url_path = '/' + rel_path.replace('\\', '/')
        
        # 替换 vrImage
        import re
        pattern = r"vrImage:\s*['\"][^'\"]*['\"]"
        
        if re.search(pattern, content):
            new_content = re.sub(
                pattern,
                f"vrImage: '{url_path}'",
                content
            )
            
            with open(page_file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            print_colored(Colors.GREEN, '✓ 已更新 page.tsx 中的 vrImage 路径')
            print_colored(Colors.CYAN, f'  新路径: {url_path}')
            return True
        else:
            print_colored(Colors.YELLOW, '⚠ 无法找到 vrImage 配置，请手动更新')
            print_colored(Colors.CYAN, f'  建议的路径: {url_path}')
            return False
    except Exception as e:
        print_colored(Colors.RED, f'✗ 更新 page.tsx 失败: {e}')
        return False

def main():
    print('\n' + '=' * 60)
    print_colored(Colors.BLUE, '🚀 VR 产品图集成助手')
    print('=' * 60 + '\n')
    
    paths = get_project_paths()
    
    # 第一步：查找或接收全景图路径
    print_colored(Colors.CYAN, '📍 第一步: 查找全景图文件...\n')
    
    panorama_path = None
    
    # 如果提供了命令行参数
    if len(sys.argv) > 1:
        provided_path = sys.argv[1]
        if os.path.exists(provided_path):
            panorama_path = provided_path
            print_colored(Colors.GREEN, '✓ 使用提供的文件:')
            print_colored(Colors.CYAN, f'  {provided_path}')
        else:
            print_colored(Colors.RED, f'✗ 文件不存在: {provided_path}')
            sys.exit(1)
    else:
        # 在项目根目录搜索
        panorama_path = find_panorama_image(str(paths['project_root']))
        
        if not panorama_path:
            print_colored(Colors.YELLOW, '⚠ 在项目根目录未找到全景图')
            print_colored(Colors.CYAN, '\n使用方法:')
            print_colored(Colors.CYAN, f'  python setup-vr-images.py <全景图路径>')
            print_colored(Colors.CYAN, '\n或在项目根目录放置全景图，文件名应包含:')
            for pattern in ['panorama', '360', 'equirect', 'titanium']:
                print_colored(Colors.CYAN, f'  - {pattern}*')
            sys.exit(1)
    
    print_colored(Colors.GREEN, '✓ 找到全景图:')
    print_colored(Colors.CYAN, f'  文件: {os.path.basename(panorama_path)}')
    print_colored(Colors.CYAN, f'  大小: {get_image_size(panorama_path)}')
    
    # 第二步：创建目标目录
    print_colored(Colors.CYAN, '\n📍 第二步: 准备目标目录...\n')
    
    os.makedirs(paths['vr_dir'], exist_ok=True)
    print_colored(Colors.GREEN, '✓ 目标目录已准备:')
    print_colored(Colors.CYAN, f'  {paths["vr_dir"]}')
    
    # 第三步：复制文件
    print_colored(Colors.CYAN, '\n📍 第三步: 复制全景图...\n')
    
    filename = os.path.basename(panorama_path)
    target_path = os.path.join(paths['vr_dir'], filename)
    
    if os.path.exists(target_path):
        print_colored(Colors.YELLOW, '⚠ 文件已存在，将覆盖:')
        print_colored(Colors.CYAN, f'  {target_path}')
    
    try:
        shutil.copy2(panorama_path, target_path)
        print_colored(Colors.GREEN, '✓ 已复制文件到:')
        print_colored(Colors.CYAN, f'  {target_path}')
    except Exception as e:
        print_colored(Colors.RED, f'✗ 复制失败: {e}')
        sys.exit(1)
    
    # 第四步：更新配置
    print_colored(Colors.CYAN, '\n📍 第四步: 更新页面配置...\n')
    
    update_success = update_page_file(
        target_path,
        paths['page_file'],
        paths['public_dir']
    )
    
    # 完成
    print('\n' + '=' * 60)
    if update_success:
        print_colored(Colors.GREEN, '✓ 集成完成！')
        print_colored(Colors.CYAN, '\n后续步骤:')
        print_colored(Colors.CYAN, '  1. 运行: npm run dev')
        print_colored(Colors.CYAN, '  2. 打开: http://localhost:3000')
        print_colored(Colors.CYAN, '  3. 测试 VR 全景查看功能')
    else:
        print_colored(Colors.YELLOW, '⚠ 部分步骤需要手动完成')
        print_colored(Colors.CYAN, '\n请手动编辑 src/app/page.tsx:')
        rel_path = os.path.relpath(target_path, paths['public_dir'])
        url_path = '/' + rel_path.replace('\\', '/')
        print_colored(Colors.YELLOW, f"  找到: vrImage: 'https://...'")
        print_colored(Colors.YELLOW, f"  替换为: vrImage: '{url_path}'")
    
    print('=' * 60 + '\n')

if __name__ == '__main__':
    main()
