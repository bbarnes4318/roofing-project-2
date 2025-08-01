const { prisma } = require('../config/prisma');

class CustomerService {

  // Create a new customer with primary/secondary support (NEW REQUIREMENT)
  async createCustomer(customerData) {
    try {
      console.log('Creating customer with data:', customerData);

      // Validate required fields
      if (!customerData.primaryName || !customerData.primaryEmail || !customerData.primaryPhone || !customerData.address) {
        throw new Error('Primary customer name, email, phone, and address are required');
      }

      // If secondary customer info is provided, validate primary contact selection
      const hasSecondaryCustomer = customerData.secondaryName || customerData.secondaryEmail || customerData.secondaryPhone;
      
      if (hasSecondaryCustomer) {
        // If there's a secondary customer, primaryContact must be explicitly set
        if (!customerData.primaryContact || !['PRIMARY', 'SECONDARY'].includes(customerData.primaryContact)) {
          throw new Error('When secondary customer is provided, primaryContact must be either PRIMARY or SECONDARY');
        }
        
        // Validate secondary customer has at least name and one contact method
        if (customerData.primaryContact === 'SECONDARY' && !customerData.secondaryName) {
          throw new Error('Secondary customer name is required when secondary is the primary contact');
        }
      } else {
        // No secondary customer, default to PRIMARY
        customerData.primaryContact = 'PRIMARY';
      }

      const customer = await prisma.customer.create({
        data: {
          primaryName: customerData.primaryName,
          primaryEmail: customerData.primaryEmail,
          primaryPhone: customerData.primaryPhone,
          secondaryName: customerData.secondaryName || null,
          secondaryEmail: customerData.secondaryEmail || null,
          secondaryPhone: customerData.secondaryPhone || null,
          primaryContact: customerData.primaryContact || 'PRIMARY',
          address: customerData.address, // This becomes projectName when projects are created
          notes: customerData.notes || null
        }
      });

      console.log('✅ Customer created successfully:', customer.id);
      return customer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  // Get customer by ID with complete information
  async getCustomerById(customerId) {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          projects: {
            select: {
              id: true,
              projectNumber: true,
              projectName: true,
              projectType: true,
              status: true,
              startDate: true,
              endDate: true,
              budget: true,
              progress: true
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      return customer;
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw error;
    }
  }

  // Update customer information (keeping projects in sync)
  async updateCustomer(customerId, updateData) {
    try {
      console.log('Updating customer:', customerId, updateData);

      // If secondary customer info is being updated, validate primary contact selection
      const existingCustomer = await prisma.customer.findUnique({
        where: { id: customerId }
      });

      if (!existingCustomer) {
        throw new Error('Customer not found');
      }

      // Determine if there will be a secondary customer after update
      const hasSecondaryAfterUpdate = updateData.secondaryName || 
                                     updateData.secondaryEmail || 
                                     updateData.secondaryPhone ||
                                     (existingCustomer.secondaryName && updateData.secondaryName !== null) ||
                                     (existingCustomer.secondaryEmail && updateData.secondaryEmail !== null) ||
                                     (existingCustomer.secondaryPhone && updateData.secondaryPhone !== null);

      // Validate primary contact selection
      if (hasSecondaryAfterUpdate && updateData.primaryContact) {
        if (!['PRIMARY', 'SECONDARY'].includes(updateData.primaryContact)) {
          throw new Error('primaryContact must be either PRIMARY or SECONDARY');
        }
        
        if (updateData.primaryContact === 'SECONDARY' && 
            (!updateData.secondaryName && !existingCustomer.secondaryName)) {
          throw new Error('Secondary customer name is required when secondary is the primary contact');
        }
      }

      // If removing secondary customer info, reset primary contact to PRIMARY
      if (!hasSecondaryAfterUpdate) {
        updateData.primaryContact = 'PRIMARY';
      }

      const updatedCustomer = await prisma.customer.update({
        where: { id: customerId },
        data: updateData
      });

      // If address changed, update all project names to match (NEW REQUIREMENT)
      if (updateData.address && updateData.address !== existingCustomer.address) {
        console.log('Address changed, updating project names to match...');
        
        await prisma.project.updateMany({
          where: { customerId: customerId },
          data: { projectName: updateData.address }
        });
        
        console.log('✅ Updated project names to match new customer address');
      }

      return updatedCustomer;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  // Get all customers with basic project information
  async getAllCustomers(filters = {}) {
    try {
      const where = {};
      
      // Add search functionality
      if (filters.search) {
        where.OR = [
          { primaryName: { contains: filters.search, mode: 'insensitive' } },
          { secondaryName: { contains: filters.search, mode: 'insensitive' } },
          { primaryEmail: { contains: filters.search, mode: 'insensitive' } },
          { secondaryEmail: { contains: filters.search, mode: 'insensitive' } },
          { address: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      const customers = await prisma.customer.findMany({
        where,
        include: {
          projects: {
            select: {
              id: true,
              projectNumber: true,
              projectName: true,
              status: true,
              progress: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return customers;
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  }

  // Search customers by various criteria
  async searchCustomers(query, options = {}) {
    try {
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
      
      const customers = await prisma.customer.findMany({
        where: {
          OR: searchTerms.flatMap(term => [
            { primaryName: { contains: term, mode: 'insensitive' } },
            { secondaryName: { contains: term, mode: 'insensitive' } },
            { primaryEmail: { contains: term, mode: 'insensitive' } },
            { secondaryEmail: { contains: term, mode: 'insensitive' } },
            { primaryPhone: { contains: term, mode: 'insensitive' } },
            { secondaryPhone: { contains: term, mode: 'insensitive' } },
            { address: { contains: term, mode: 'insensitive' } }
          ])
        },
        include: {
          projects: {
            select: {
              id: true,
              projectNumber: true,
              projectName: true,
              status: true
            }
          }
        },
        take: options.limit || 20,
        orderBy: options.orderBy || { primaryName: 'asc' }
      });

      return customers;
    } catch (error) {
      console.error('Error searching customers:', error);
      throw error;
    }
  }

  // Get primary contact information (NEW HELPER METHOD)
  getPrimaryContactInfo(customer) {
    if (customer.primaryContact === 'SECONDARY') {
      return {
        name: customer.secondaryName,
        email: customer.secondaryEmail,
        phone: customer.secondaryPhone,
        type: 'SECONDARY'
      };
    } else {
      return {
        name: customer.primaryName,
        email: customer.primaryEmail,
        phone: customer.primaryPhone,
        type: 'PRIMARY'
      };
    }
  }

  // Get all contact information for a customer (NEW HELPER METHOD)
  getAllContactInfo(customer) {
    const contacts = [
      {
        name: customer.primaryName,
        email: customer.primaryEmail,
        phone: customer.primaryPhone,
        type: 'PRIMARY',
        isPrimaryContact: customer.primaryContact === 'PRIMARY'
      }
    ];

    if (customer.secondaryName || customer.secondaryEmail || customer.secondaryPhone) {
      contacts.push({
        name: customer.secondaryName,
        email: customer.secondaryEmail,
        phone: customer.secondaryPhone,
        type: 'SECONDARY',
        isPrimaryContact: customer.primaryContact === 'SECONDARY'
      });
    }

    return contacts;
  }

  // Validate customer data before creation/update
  validateCustomerData(customerData, isUpdate = false) {
    const errors = [];

    // Primary customer validation
    if (!isUpdate || customerData.primaryName !== undefined) {
      if (!customerData.primaryName || customerData.primaryName.trim().length === 0) {
        errors.push('Primary customer name is required');
      }
    }

    if (!isUpdate || customerData.primaryEmail !== undefined) {
      if (!customerData.primaryEmail || !this.isValidEmail(customerData.primaryEmail)) {
        errors.push('Valid primary customer email is required');
      }
    }

    if (!isUpdate || customerData.primaryPhone !== undefined) {
      if (!customerData.primaryPhone || customerData.primaryPhone.trim().length === 0) {
        errors.push('Primary customer phone is required');
      }
    }

    if (!isUpdate || customerData.address !== undefined) {
      if (!customerData.address || customerData.address.trim().length === 0) {
        errors.push('Customer address is required');
      }
    }

    // Secondary customer validation
    const hasSecondaryInfo = customerData.secondaryName || customerData.secondaryEmail || customerData.secondaryPhone;
    
    if (hasSecondaryInfo) {
      if (customerData.secondaryEmail && !this.isValidEmail(customerData.secondaryEmail)) {
        errors.push('Secondary customer email must be valid if provided');
      }

      // If primary contact is set to SECONDARY, secondary name is required
      if (customerData.primaryContact === 'SECONDARY' && !customerData.secondaryName) {
        errors.push('Secondary customer name is required when secondary is the primary contact');
      }
    }

    // Primary contact validation
    if (customerData.primaryContact && !['PRIMARY', 'SECONDARY'].includes(customerData.primaryContact)) {
      errors.push('Primary contact must be either PRIMARY or SECONDARY');
    }

    return errors;
  }

  // Email validation helper
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Delete customer and all related projects
  async deleteCustomer(customerId) {
    try {
      // Check if customer has any projects
      const customerWithProjects = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          projects: { select: { id: true } }
        }
      });

      if (!customerWithProjects) {
        throw new Error('Customer not found');
      }

      if (customerWithProjects.projects.length > 0) {
        // Option 1: Prevent deletion if projects exist
        throw new Error(`Cannot delete customer with ${customerWithProjects.projects.length} associated projects. Please delete or reassign projects first.`);
        
        // Option 2: Delete all projects (uncomment if needed)
        // console.log(`Deleting ${customerWithProjects.projects.length} associated projects...`);
        // await prisma.project.deleteMany({
        //   where: { customerId: customerId }
        // });
      }

      await prisma.customer.delete({
        where: { id: customerId }
      });

      return { success: true, message: 'Customer deleted successfully' };
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }

  // Get customer statistics
  async getCustomerStats() {
    try {
      const [totalCustomers, customersWithSecondary, totalProjects] = await Promise.all([
        prisma.customer.count(),
        prisma.customer.count({
          where: {
            OR: [
              { secondaryName: { not: null } },
              { secondaryEmail: { not: null } },
              { secondaryPhone: { not: null } }
            ]
          }
        }),
        prisma.project.count()
      ]);

      return {
        totalCustomers,
        customersWithSecondary,
        customersWithPrimaryOnly: totalCustomers - customersWithSecondary,
        totalProjects,
        averageProjectsPerCustomer: totalCustomers > 0 ? (totalProjects / totalCustomers).toFixed(1) : 0
      };
    } catch (error) {
      console.error('Error fetching customer statistics:', error);
      throw error;
    }
  }
}

module.exports = new CustomerService(); 