# 云存储目录结构

```
cloud-storage/
├── avatars/              # 用户头像
│   └── {user_id}/       # 按用户ID存储
├── class/               # 课程相关文件
│   ├── covers/          # 课程封面图
│   └── materials/       # 课程资料
├── tasks/               # 任务相关文件
│   ├── attachments/     # 任务附件
│   └── submissions/     # 任务提交
├── check_in/            # 签到相关
│   ├── qrcodes/        # 签到二维码
│   └── records/        # 签到记录（如照片等）
└── temp/               # 临时文件目录
```

## 目录说明

### avatars/
- 用途：存储用户头像
- 命名规则：`avatars/{user_id}/avatar.{ext}`
- 权限：用户可读写自己的头像

### class/
- covers/
  - 用途：课程封面图片
  - 命名规则：`class/covers/{class_id}.{ext}`
  - 权限：教师可写，所有人可读
- materials/
  - 用途：课程相关资料
  - 命名规则：`class/materials/{class_id}/{file_name}.{ext}`
  - 权限：教师可写，课程成员可读

### tasks/
- attachments/
  - 用途：任务相关附件
  - 命名规则：`tasks/attachments/{task_id}/{file_name}.{ext}`
  - 权限：教师可写，课程成员可读
- submissions/
  - 用途：学生提交的任务文件
  - 命名规则：`tasks/submissions/{task_id}/{user_id}/{file_name}.{ext}`
  - 权限：学生可写自己的提交，教师可读所有提交

### check_in/
- qrcodes/
  - 用途：签到用的二维码图片
  - 命名规则：`check_in/qrcodes/{task_id}.png`
  - 权限：教师可写，所有人可读
- records/
  - 用途：签到时上传的照片等记录
  - 命名规则：`check_in/records/{task_id}/{user_id}/{timestamp}.{ext}`
  - 权限：用户可写自己的记录，教师可读所有记录

### temp/
- 用途：临时文件存储，定期清理
- 命名规则：`temp/{user_id}/{timestamp}_{random}.{ext}`
- 权限：用户可写自己的临时文件
- 清理规则：文件保存24小时后自动删除 