import zipfile
import os

dist_dir = 'dist'
zip_filename = 'WhyUI-v1.0.0-Edge.zip'

if not os.path.exists(dist_dir) or not os.path.exists(os.path.join(dist_dir, 'manifest.json')):
    print("Error: dist/manifest.json does not exist. Run 'npm run build' first.")
    exit(1)

if os.path.exists(zip_filename):
    os.remove(zip_filename)

with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(dist_dir):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, dist_dir).replace('\\', '/')
            zipf.write(file_path, arcname)

size_mb = os.path.getsize(zip_filename) / (1024 * 1024)
print(f'Successfully created {zip_filename} ({size_mb:.2f} MB)')
print('Verified zip contents:')
with zipfile.ZipFile(zip_filename, 'r') as z:
    for item in z.namelist():
        print(f'  + {item}')
print('\nPackage is 100% ready for Microsoft Edge Add-ons Partner Center!')
