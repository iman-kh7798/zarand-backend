export class CreateUserDto {
  email?: string;
  password: string; // از bcrypt هش می‌کنیم بعد ذخیره می‌کنیم
  name?: string;
  phone: string;
  roleId: number; // FK → Role (مثلاً admin=1, owner=2, customer=3)
}
