require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with initial master data...');

  // 1. Clean up existing tables
  console.log('🧹 Cleaning up database tables...');
  await prisma.activityLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.auditItem.deleteMany({});
  await prisma.auditCycleAuditor.deleteMany({});
  await prisma.auditCycle.deleteMany({});
  await prisma.maintenanceRequest.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.transferRequest.deleteMany({});
  await prisma.allocation.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.assetCategory.deleteMany({});
  
  // Set HOD to null to prevent circular FK issues on delete
  await prisma.department.updateMany({ data: { headUserId: null, parentDepartmentId: null } });
  await prisma.department.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Hash default password (Password123!)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  // 3. Create Users
  console.log('👥 Creating users...');
  const priya = await prisma.user.create({
    data: { name: 'Priya Shah', email: 'priya@assetflow.io', role: 'DepartmentHead', passwordHash },
  });
  const marcus = await prisma.user.create({
    data: { name: 'Marcus Chen', email: 'marcus@assetflow.io', role: 'AssetManager', passwordHash },
  });
  const elena = await prisma.user.create({
    data: { name: 'Elena Volkov', email: 'elena@assetflow.io', role: 'Admin', passwordHash },
  });
  const james = await prisma.user.create({
    data: { name: 'James Okafor', email: 'james@assetflow.io', role: 'Employee', passwordHash },
  });
  const sara = await prisma.user.create({
    data: { name: 'Sara Lindqvist', email: 'sara@assetflow.io', role: 'Employee', passwordHash },
  });
  const aisha = await prisma.user.create({
    data: { name: 'Aisha Rahman', email: 'aisha@assetflow.io', role: 'DepartmentHead', passwordHash },
  });
  const tom = await prisma.user.create({
    data: { name: 'Tom Bridger', email: 'tom@assetflow.io', role: 'Employee', passwordHash },
  });

  // 4. Create Departments
  console.log('🏢 Creating departments...');
  const engineering = await prisma.department.create({
    data: { name: 'Engineering', headUserId: priya.id },
  });
  const it = await prisma.department.create({
    data: { name: 'IT', headUserId: marcus.id, parentDepartmentId: engineering.id },
  });
  const operations = await prisma.department.create({
    data: { name: 'Operations', headUserId: elena.id },
  });
  const procurement = await prisma.department.create({
    data: { name: 'Procurement', headUserId: aisha.id, parentDepartmentId: operations.id },
  });
  const facilities = await prisma.department.create({
    data: { name: 'Facilities' },
  });

  // 5. Update user departments
  console.log('🔗 Associating users to departments...');
  await prisma.user.update({ where: { id: priya.id }, data: { departmentId: engineering.id } });
  await prisma.user.update({ where: { id: marcus.id }, data: { departmentId: it.id } });
  await prisma.user.update({ where: { id: elena.id }, data: { departmentId: operations.id } });
  await prisma.user.update({ where: { id: james.id }, data: { departmentId: engineering.id } });
  await prisma.user.update({ where: { id: sara.id }, data: { departmentId: it.id } });
  await prisma.user.update({ where: { id: aisha.id }, data: { departmentId: procurement.id } });
  await prisma.user.update({ where: { id: tom.id }, data: { departmentId: operations.id } });

  // 6. Create Asset Categories
  console.log('🏷️ Creating categories...');
  const laptops = await prisma.assetCategory.create({ data: { name: 'Laptops' } });
  const monitors = await prisma.assetCategory.create({ data: { name: 'Monitors' } });
  const vehicles = await prisma.assetCategory.create({ data: { name: 'Vehicles' } });
  const medical = await prisma.assetCategory.create({ data: { name: 'Medical Equipment' } });
  const meetingRooms = await prisma.assetCategory.create({ data: { name: 'Meeting Rooms' } });
  const powerTools = await prisma.assetCategory.create({ data: { name: 'Power Tools' } });

  // 7. Create Assets
  console.log('📦 Creating assets...');
  const asset1 = await prisma.asset.create({
    data: { name: 'Dell Latitude 5440', assetTag: 'AF-0001', categoryId: laptops.id, serialNumber: 'DL5440-22X91', acquisitionDate: new Date('2023-03-15'), acquisitionCost: 1450, condition: 'Good', status: 'Allocated', location: 'Floor 3 — Desk 12', isBookable: false },
  });
  const asset2 = await prisma.asset.create({
    data: { name: 'HP EliteDisplay 27', assetTag: 'AF-0002', categoryId: monitors.id, serialNumber: 'HP27-44820', condition: 'Good', status: 'Available', location: 'IT Storage Room', isBookable: false },
  });
  const asset3 = await prisma.asset.create({
    data: { name: 'Toyota Hilux Fleet 03', assetTag: 'AF-0003', categoryId: vehicles.id, serialNumber: 'TH-2023-003', acquisitionDate: new Date('2023-06-01'), acquisitionCost: 42000, condition: 'Good', status: 'Allocated', location: 'Loading Bay', isBookable: true },
  });
  const asset4 = await prisma.asset.create({
    data: { name: 'Ultrasound Probe X7', assetTag: 'AF-0004', categoryId: medical.id, serialNumber: 'USP-X7-0012', acquisitionDate: new Date('2022-11-20'), acquisitionCost: 8900, condition: 'Fair', status: 'UnderMaintenance', location: 'Clinic Room B', isBookable: false },
  });
  const asset5 = await prisma.asset.create({
    data: { name: 'Conference Room Aurora', assetTag: 'AF-0005', categoryId: meetingRooms.id, condition: 'New', status: 'Available', location: 'Floor 2 — West Wing', isBookable: true },
  });
  const asset6 = await prisma.asset.create({
    data: { name: 'MacBook Pro 16"', assetTag: 'AF-0006', categoryId: laptops.id, serialNumber: 'MBP16-55210', acquisitionDate: new Date('2024-01-10'), acquisitionCost: 2800, condition: 'New', status: 'Available', location: 'IT Storage Room', isBookable: false },
  });
  const asset7 = await prisma.asset.create({
    data: { name: 'Bosch Drill Set', assetTag: 'AF-0007', categoryId: powerTools.id, serialNumber: 'BD-SET-088', condition: 'Good', status: 'Available', location: 'Maintenance Closet', isBookable: true },
  });
  const asset8 = await prisma.asset.create({
    data: { name: 'Dell PowerEdge R650', assetTag: 'AF-0008', categoryId: monitors.id, serialNumber: 'DPE-650-3340', acquisitionDate: new Date('2023-09-05'), acquisitionCost: 5200, condition: 'Good', status: 'Allocated', location: 'Server Room A', isBookable: false },
  });

  // 8. Create Allocations
  console.log('📌 Creating allocations...');
  await prisma.allocation.create({
    data: { assetId: asset1.id, holderUserId: priya.id, status: 'Active', allocatedAt: new Date('2024-05-01T09:00:00Z'), expectedReturnDate: new Date('2025-05-01T17:00:00Z') },
  });
  await prisma.allocation.create({
    data: { assetId: asset3.id, holderUserId: tom.id, status: 'Active', allocatedAt: new Date('2024-06-10T08:00:00Z') },
  });
  await prisma.allocation.create({
    data: { assetId: asset8.id, holderUserId: sara.id, status: 'Active', allocatedAt: new Date('2024-04-15T10:00:00Z') },
  });
  // Overdue allocation (James Okafor)
  await prisma.allocation.create({
    data: { assetId: asset1.id, holderUserId: james.id, status: 'Active', allocatedAt: new Date('2024-03-20T11:00:00Z'), expectedReturnDate: new Date('2024-07-01T17:00:00Z') },
  });
  // Returned allocation
  await prisma.allocation.create({
    data: { assetId: asset2.id, holderUserId: sara.id, status: 'Returned', allocatedAt: new Date('2024-01-10T10:00:00Z'), actualReturnDate: new Date('2024-04-01T15:00:00Z'), returnConditionNotes: 'No issues' },
  });

  // 9. Create Transfer Requests
  console.log('🔄 Creating transfer requests...');
  await prisma.transferRequest.create({
    data: { assetId: asset1.id, currentAllocationId: (await prisma.allocation.findFirst({ where: { assetId: asset1.id } })).id, requestedByUserId: priya.id, requestedToUserId: james.id, status: 'Requested' },
  });

  // 10. Create Bookings (Aurora room)
  console.log('📅 Creating bookings...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  await prisma.booking.create({
    data: { assetId: asset5.id, bookedByUserId: aisha.id, departmentId: procurement.id, startTime: new Date(`${dateStr}T09:00:00.000Z`), endTime: new Date(`${dateStr}T10:00:00.000Z`), status: 'Upcoming' },
  });
  await prisma.booking.create({
    data: { assetId: asset5.id, bookedByUserId: priya.id, departmentId: engineering.id, startTime: new Date(`${dateStr}T11:00:00.000Z`), endTime: new Date(`${dateStr}T12:30:00.000Z`), status: 'Upcoming' },
  });

  // 11. Create Maintenance Requests
  console.log('🔧 Creating maintenance requests...');
  await prisma.maintenanceRequest.create({
    data: { assetId: asset4.id, raisedByUserId: elena.id, issueDescription: 'Display flickering during operation, intermittent signal loss', priority: 'High', status: 'Pending' },
  });
  await prisma.maintenanceRequest.create({
    data: { assetId: asset1.id, raisedByUserId: priya.id, issueDescription: 'Battery drains within 2 hours, not holding charge', priority: 'Medium', status: 'Approved', approvedByUserId: marcus.id, technicianName: 'Display Services Co.' },
  });

  console.log('🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
