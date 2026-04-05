import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
  ) {}

  async create(orgId: string, dto: CreateDepartmentDto): Promise<Department> {
    const department = this.departmentRepo.create({
      organizationId: orgId,
      name: dto.name,
      description: dto.description,
      parentDepartmentId: dto.parentDepartmentId,
    });
    return this.departmentRepo.save(department);
  }

  async findAll(orgId: string): Promise<Department[]> {
    const departments = await this.departmentRepo.find({
      where: { organizationId: orgId },
      relations: ['children'],
    });

    const deptMap = new Map<string, Department>();
    departments.forEach((d) => deptMap.set(d.id, d));

    const roots: Department[] = [];
    for (const dept of departments) {
      if (!dept.parentDepartmentId) {
        roots.push(dept);
      }
    }

    return roots;
  }

  async findById(id: string): Promise<Department> {
    const department = await this.departmentRepo.findOne({
      where: { id },
      relations: ['children'],
    });
    if (!department) {
      throw new NotFoundException(`Department with ID "${id}" not found`);
    }
    return department;
  }

  async update(id: string, dto: Partial<CreateDepartmentDto>): Promise<Department> {
    await this.findById(id);
    await this.departmentRepo.update(id, dto);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    const department = await this.findById(id);
    await this.departmentRepo.remove(department);
  }
}
