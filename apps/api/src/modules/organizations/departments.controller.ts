import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';

@ApiTags('Departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a department' })
  create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.departmentsService.create(orgId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all departments (tree structure)' })
  findAll(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.departmentsService.findAll(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.departmentsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a department' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a department' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.departmentsService.remove(id);
  }
}
