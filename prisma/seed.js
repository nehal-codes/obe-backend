// backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // Create departments
  const csDept = await prisma.department.upsert({
    where: { code: 'CSE' },
    update: {},
    create: {
      name: 'Computer Science and Engineering',
      code: 'CSE',
      description: 'Department of Computer Science and Engineering'
    }
  });

  // Create users
  const adminPassword = await bcrypt.hash('admin123', 12);
  const hodPassword = await bcrypt.hash('hod123', 12);
  const facultyPassword = await bcrypt.hash('faculty123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@obe.edu' },
    update: {},
    create: {
      email: 'admin@obe.edu',
      password: adminPassword,
      name: 'System Administrator',
      role: 'ADMIN'
    }
  });

  const hod = await prisma.user.upsert({
    where: { email: 'hod.cse@obe.edu' },
    update: {},
    create: {
      email: 'hod.cse@obe.edu',
      password: hodPassword,
      name: 'Dr. HOD CSE',
      role: 'HOD',
      departmentId: csDept.id
    }
  });

  const faculty = await prisma.user.upsert({
    where: { email: 'faculty.cse@obe.edu' },
    update: {},
    create: {
      email: 'faculty.cse@obe.edu',
      password: facultyPassword,
      name: 'Dr. Faculty Member',
      role: 'FACULTY',
      departmentId: csDept.id
    }
  });

  // Create POs
  const pos = [
    { poCode: 'PO1', description: 'Engineering knowledge' },
    { poCode: 'PO2', description: 'Problem analysis' },
    { poCode: 'PO3', description: 'Design/development of solutions' },
    { poCode: 'PO4', description: 'Conduct investigations of complex problems' },
    { poCode: 'PO5', description: 'Modern tool usage' },
    { poCode: 'PO6', description: 'The engineer and society' },
    { poCode: 'PO7', description: 'Environment and sustainability' },
    { poCode: 'PO8', description: 'Ethics' },
    { poCode: 'PO9', description: 'Individual and team work' },
    { poCode: 'PO10', description: 'Communication' },
    { poCode: 'PO11', description: 'Project management and finance' },
    { poCode: 'PO12', description: 'Life-long learning' }
  ];

  for (const po of pos) {
    await prisma.pO.upsert({
      where: { 
        poCode_departmentId_version: {
          poCode: po.poCode,
          departmentId: csDept.id,
          version: '1.0'
        }
      },
      update: {},
      create: {
        ...po,
        departmentId: csDept.id,
        version: '1.0'
      }
    });
  }
  
  const bsc = await prisma.programme.upsert({
  where: { code: "BSC-CSE" },
  update: {},
  create: {
    name: "B.Sc Computer Science",
    code: "BSC-CSE",
    description: "Undergraduate Programme",
    departmentId: csDept.id
  }
});

const msc = await prisma.programme.upsert({
  where: { code: "MSC-CSE" },
  update: {},
  create: {
    name: "M.Sc Computer Science",
    code: "MSC-CSE",
    description: "Postgraduate Programme",
    departmentId: csDept.id
  }
});

const bvoc = await prisma.programme.upsert({
  where: { code: "BVOC-CSE" },
  update: {},
  create: {
    name: "B.Voc Software Development",
    code: "BVOC-CSE",
    description: "Vocational Programme",
    departmentId: csDept.id
  }
});
await prisma.course.create({
  data: {
    code: "CS101",
    name: "Introduction to Programming",
    credits: 4,
    category: "Core",
    departmentId: csDept.id,
    programmeId: bsc.id,       // 🔥 LINKED TO PROGRAMME
    createdById: admin.id
  }
});

await prisma.course.create({
  data: {
    code: "CS501",
    name: "Advanced Machine Learning",
    credits: 4,
    category: "Core",
    departmentId: csDept.id,
    programmeId: msc.id,       // 🔥 LINKED TO MSC
    createdById: hod.id
  }
});

  // Create PSOs
  const psos = [
    { psoCode: 'PSO1', description: 'Software Development' },
    { psoCode: 'PSO2', description: 'Data Science and Analytics' },
    { psoCode: 'PSO3', description: 'Network and Security' }
  ];

  for (const pso of psos) {
    await prisma.pSO.upsert({
      where: {
        psoCode_departmentId_version: {
          psoCode: pso.psoCode,
          departmentId: csDept.id,
          version: '1.0'
        }
      },
      update: {},
      create: {
        ...pso,
        departmentId: csDept.id,
        version: '1.0'
      }
    });
  }

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });