'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Enable UUID extension
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // Create User table
    await queryInterface.createTable('User', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      googleId: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      profilePicture: {
        type: Sequelize.TEXT, 
        allowNull: true,
      },
  
      clinicId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      organizationId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      role: {
        type: Sequelize.ENUM('admin', 'manager', 'doctor', 'nurse', 'patient'),
        allowNull: false,
        defaultValue: 'patient'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create Organization table
    await queryInterface.createTable('Organization', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      organizationId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      registrationNumber: {
        type: Sequelize.STRING,
        allowNull: false
      },
      dateOfEstablishment: {
        type: Sequelize.DATE,
        allowNull: true
      },
      address: {
        type: Sequelize.STRING,
        allowNull: false
      },
      location: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      contactEmail: {
        type: Sequelize.STRING,
        allowNull: false
      },
      contactPhone: {
        type: Sequelize.STRING,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create Clinic table
    await queryInterface.createTable('Clinic', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      clinicId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      organizationId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      registrationNumber: {
        type: Sequelize.STRING,
        allowNull: false
      },
      dateOfEstablishment: {
        type: Sequelize.DATE,
        allowNull: true
      },
      type: {
        type: Sequelize.ENUM(
          'Diagnostic',
          'Hospital',
          'Clinic',
          'Branch',
          'Emergency Center',
          'Medical Center',
          'General Practice'
        ),
        allowNull: false
      },
      address: {
        type: Sequelize.STRING,
        allowNull: false
      },
      location: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      contactEmail: {
        type: Sequelize.STRING,
        allowNull: false
      },
      contactPhone: {
        type: Sequelize.STRING,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create Patient table
    await queryInterface.createTable('Patient', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      mrn: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      organizationId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      clinicId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      dob: {
        type: Sequelize.DATE,
        allowNull: true
      },
      gender: {
        type: Sequelize.STRING,
        allowNull: true
      },
      emailId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        unique: true,
        references: {
          model: 'User',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      precautions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      allergies: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: Sequelize.literal("'[]'")

      },
      emergencyContact: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      diagnoses: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: Sequelize.literal("'{}'")

      },
      status: {
        type: Sequelize.ENUM('Active', 'Discharged'),
        allowNull: false,
        defaultValue: 'Active'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create Staff table
    await queryInterface.createTable('Staff', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      employeeId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      organizationId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      clinicId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'User',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      contact: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      role: {
        type: Sequelize.STRING,
        allowNull: true
      },
      department: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: Sequelize.literal("'{}'")

      },
      shift: {
        type: Sequelize.STRING,
        allowNull: true
      },
      certifications: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: Sequelize.literal("'{}'")

      },
      specializations: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: Sequelize.literal("'{}'")

      },
      status: {
        type: Sequelize.ENUM('On-Duty', 'Off-Duty', 'Leave'),
        allowNull: false,
        defaultValue: 'On-Duty'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create Room table
    await queryInterface.createTable('Room', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      organizationId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      clinicId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      roomNumber: {
        type: Sequelize.STRING,
        allowNull: false
      },
      unit: {
        type: Sequelize.STRING,
        allowNull: false
      },
      roomType: {
        type: Sequelize.STRING,
        allowNull: false
      },
      capacity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      occupiedBeds: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      equipment: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: Sequelize.literal("'{}'")

      },
      cameraIds: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: Sequelize.literal("'{}'")

      },
      accessRestrictions: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: Sequelize.literal("'{}'")

      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create Admission table
    await queryInterface.createTable('Admission', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      patientId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Patient',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      organizationId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      clinicId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      checkInTime: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      admissionDate: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      reportSentTime: {
        type: Sequelize.DATE,
        allowNull: true
      },
      dischargeDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      currentWorkflowStage: {
        type: Sequelize.ENUM(
          'Checked-In',
          'In Preparation',
          'In Thermal',
          'In CT',
          'Awaiting Results',
          'Review with Physician',
          'Report Sent',
          'Discharged',
          'Canceled',
          'On Hold'
        ),
        allowNull: false,
        defaultValue: 'Checked-In'
      },
      acuityLevel: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('Active', 'Completed', 'Canceled', 'On Hold'),
        allowNull: false,
        defaultValue: 'Active'
      },
      admittedByStaffId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Staff',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      attendingPhysicianId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Staff',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      admissionReason: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      room: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Room',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      diagnoses: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: Sequelize.literal("'{}'")

      },
      carePlan: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      documentation: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: Sequelize.literal("'{}'")

      },
      dietaryRestrictions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create indexes for Admission
    await queryInterface.addIndex('Admission', ['patientId']);
    await queryInterface.addIndex('Admission', ['status', 'checkInTime']);
    await queryInterface.addIndex('Admission', ['currentWorkflowStage', 'updatedAt']);

    // Create Task table
    await queryInterface.createTable('Task', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      organizationId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      clinicId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('Pending', 'In-Progress', 'Completed', 'Overdue'),
        allowNull: false,
        defaultValue: 'Pending'
      },
      taskType: {
        type: Sequelize.ENUM('Patient-Related', 'Operational'),
        allowNull: false
      },
      priority: {
        type: Sequelize.ENUM('Low', 'Normal', 'High', 'Urgent'),
        allowNull: false,
        defaultValue: 'Normal'
      },
      patientId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Patient',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      assignedStaffId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Staff',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      timestamps: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      dependencies: {
        type: Sequelize.ARRAY(Sequelize.UUID),
        allowNull: true,
        defaultValue: Sequelize.literal("'{}'")

      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create Vital table
    await queryInterface.createTable('Vital', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      patientId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Patient',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      mrn: {
        type: Sequelize.STRING,
        allowNull: true
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      measurements: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      recordedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Staff',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create Scan table
    await queryInterface.createTable('Scan', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      organizationId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      clinicId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      patientId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Patient',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      mrn: {
        type: Sequelize.STRING,
        allowNull: true
      },
      uploadedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'User',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      scanType: {
        type: Sequelize.ENUM(
          'Brain CT',
          'Chest CT',
          'Abdominal CT',
          'Pelvic CT',
          'Spine CT',
          'Other'
        ),
        allowNull: false
      },
      urgencyLevel: {
        type: Sequelize.ENUM('Routine', 'Urgent', 'Critical'),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('Pending Review', 'Reviewed', 'Archived'),
        allowNull: false,
        defaultValue: 'Pending Review'
      },
      fileUrl: {
        type: Sequelize.STRING,
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create Notification table
    await queryInterface.createTable('Notification', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('alert', 'reminder', 'update'),
        allowNull: false,
        defaultValue: 'alert'
      },
      recipient: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'User',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      read: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create ComplianceAlert table
    await queryInterface.createTable('ComplianceAlert', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      severity: {
        type: Sequelize.ENUM('Low', 'Moderate', 'High', 'Critical'),
        allowNull: false
      },
      source: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      recipients: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: Sequelize.literal("'[]'")

      },
      status: {
        type: Sequelize.ENUM('Pending', 'Acknowledged', 'Resolved'),
        allowNull: false,
        defaultValue: 'Pending'
      },
      timestamps: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      associatedIds: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      resolutionNotes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      eventId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'AnalyticsEvent',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      staffId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Staff',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      patientId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Patient',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      roomId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Room',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create Camera table
    await queryInterface.createTable('Camera', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      ip: {
        type: Sequelize.STRING,
        allowNull: false
      },
      rtspPort: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 554
      },
      auth: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      defaultChannel: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      defaultStream: {
        type: Sequelize.ENUM('main', 'sub'),
        allowNull: false,
        defaultValue: 'sub'
      },
      transport: {
        type: Sequelize.ENUM('tcp', 'udp', 'http'),
        allowNull: false,
        defaultValue: 'tcp'
      },
      forceEncode: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      autostart: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create CVDetection table
    await queryInterface.createTable('CVDetection', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false
      },
      cameraId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      location: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      detectionType: {
        type: Sequelize.STRING,
        allowNull: false
      },
      confidence: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      personId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Patient',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      boundingBox: {
        type: Sequelize.ARRAY(Sequelize.FLOAT),
        allowNull: true
      },
      classification: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      triggeredAlertId: {
        type: Sequelize.UUID,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create CVEvent table
    await queryInterface.createTable('CVEvent', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      cameraId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Camera',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      type: {
        type: Sequelize.ENUM('people-stats', 'enter', 'exit'),
        allowNull: true
      },
      ts: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      data: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create indexes for CVEvent
    await queryInterface.addIndex('CVEvent', ['cameraId']);
    await queryInterface.addIndex('CVEvent', ['type']);
    await queryInterface.addIndex('CVEvent', ['ts']);
    await queryInterface.addIndex('CVEvent', ['cameraId', 'ts']);
    await queryInterface.addIndex('CVEvent', ['createdAt']);

    // Create MP4File table
    await queryInterface.createTable('MP4File', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      filename: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      originalName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      filePath: {
        type: Sequelize.STRING,
        allowNull: false
      },
      size: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      mimetype: {
        type: Sequelize.STRING,
        allowNull: false
      },
      analyticsStatus: {
        type: Sequelize.ENUM('idle', 'running', 'completed', 'error'),
        allowNull: false,
        defaultValue: 'idle'
      },
      analyticsStartedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      analyticsStoppedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      analyticsResults: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create MP4Event table
    await queryInterface.createTable('MP4Event', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      mp4FileId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'MP4File',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      filename: {
        type: Sequelize.STRING,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('people-stats', 'enter', 'exit', 'processing-complete'),
        allowNull: true
      },
      ts: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      data: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create indexes for MP4Event
    await queryInterface.addIndex('MP4Event', ['mp4FileId']);
    await queryInterface.addIndex('MP4Event', ['filename']);
    await queryInterface.addIndex('MP4Event', ['type']);
    await queryInterface.addIndex('MP4Event', ['ts']);
    await queryInterface.addIndex('MP4Event', ['mp4FileId', 'ts']);
    await queryInterface.addIndex('MP4Event', ['filename', 'ts']);

    // Create AnalyticsEvent table
    await queryInterface.createTable('AnalyticsEvent', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      eventType: {
        type: Sequelize.STRING,
        allowNull: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'User',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      patientId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Patient',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create DeviceLog table
    await queryInterface.createTable('DeviceLog', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'User',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false
      },
      entity: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      details: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create UserSession table
    await queryInterface.createTable('UserSession', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'User',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      loginTime: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      logoutTime: {
        type: Sequelize.DATE,
        allowNull: true
      },
      ipAddress: {
        type: Sequelize.STRING,
        allowNull: true
      },
      device: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create Counter table
    await queryInterface.createTable('Counter', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      clinicId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      seq: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1000
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    console.log('✅ All tables created successfully');
  },

  async down(queryInterface, Sequelize) {
    // Drop all tables in reverse order (respecting foreign keys)
    await queryInterface.dropTable('Counter');
    await queryInterface.dropTable('UserSession');
    await queryInterface.dropTable('DeviceLog');
    await queryInterface.dropTable('AnalyticsEvent');
    await queryInterface.dropTable('MP4Event');
    await queryInterface.dropTable('MP4File');
    await queryInterface.dropTable('CVEvent');
    await queryInterface.dropTable('CVDetection');
    await queryInterface.dropTable('Camera');
    await queryInterface.dropTable('ComplianceAlert');
    await queryInterface.dropTable('Notification');
    await queryInterface.dropTable('Scan');
    await queryInterface.dropTable('Vital');
    await queryInterface.dropTable('Task');
    await queryInterface.dropTable('Admission');
    await queryInterface.dropTable('Room');
    await queryInterface.dropTable('Staff');
    await queryInterface.dropTable('Patient');
    await queryInterface.dropTable('Clinic');
    await queryInterface.dropTable('Organization');
    await queryInterface.dropTable('User');

    // Drop ENUMs
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_User_role";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Patient_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Staff_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Clinic_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Admission_currentWorkflowStage";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Admission_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Task_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Task_taskType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Task_priority";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Scan_scanType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Scan_urgencyLevel";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Scan_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Notification_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_ComplianceAlert_severity";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_ComplianceAlert_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Camera_defaultStream";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Camera_transport";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_CVEvent_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_MP4File_analyticsStatus";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_MP4Event_type";');

    console.log('✅ All tables dropped successfully');
  }
};
