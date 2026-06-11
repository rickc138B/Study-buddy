import { Controller, Get, Post, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';

@Controller('admin/courses')
export class CoursesController {
  constructor(private db: DatabaseService) {}

  @Get()
  async list() {
    const { data, error } = await this.db.client
      .from('courses').select('*, departments(name, code)').order('code');
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  @Post()
  async create(@Body() body: {
    code: string; title: string; level: number;
    description?: string; departmentId: string;
  }) {
    const { data, error } = await this.db.client
      .from('courses').insert({
        code:          body.code,
        title:         body.title,
        level:         body.level,
        description:   body.description,
        department_id: body.departmentId,
      }).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.db.client.from('courses').delete().eq('id', id);
  }

  @Get('departments')
  async departments() {
    const { data, error } = await this.db.client
      .from('departments').select('*').order('name');
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  @Post('departments')
  async createDepartment(@Body() body: { code: string; name: string }) {
    const { data, error } = await this.db.client
      .from('departments').insert({ code: body.code, name: body.name })
      .select().single();
    if (error) throw new Error(error.message);
    return data;
  }
}
