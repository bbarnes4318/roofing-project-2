-- Remove specific users and all their related data
-- Run this directly on your PostgreSQL database

-- First, let's see what users exist with these names
SELECT id, "firstName", "lastName", email FROM "users" 
WHERE ("firstName" || ' ' || "lastName") IN (
    'Seed User 10',
    'Seed User 1', 
    'Sarah Thompson',
    'Michael Chen',
    'Logan Price',
    'Jessica Martinez',
    'James Rodriguez',
    'Emily Davis',
    'David Wilson',
    'Daniel Miller',
    'Christopher Brown',
    'Amanda Garcia'
);

-- Delete related records first (to avoid foreign key constraints)
DELETE FROM "workflow_alerts" WHERE "assignedToId" IN (
    SELECT id FROM "users" 
    WHERE ("firstName" || ' ' || "lastName") IN (
        'Seed User 10',
        'Seed User 1', 
        'Sarah Thompson',
        'Michael Chen',
        'Logan Price',
        'Jessica Martinez',
        'James Rodriguez',
        'Emily Davis',
        'David Wilson',
        'Daniel Miller',
        'Christopher Brown',
        'Amanda Garcia'
    )
);

DELETE FROM "workflow_alerts" WHERE "createdById" IN (
    SELECT id FROM "users" 
    WHERE ("firstName" || ' ' || "lastName") IN (
        'Seed User 10',
        'Seed User 1', 
        'Sarah Thompson',
        'Michael Chen',
        'Logan Price',
        'Jessica Martinez',
        'James Rodriguez',
        'Emily Davis',
        'David Wilson',
        'Daniel Miller',
        'Christopher Brown',
        'Amanda Garcia'
    )
);

DELETE FROM "project_team_members" WHERE "userId" IN (
    SELECT id FROM "users" 
    WHERE ("firstName" || ' ' || "lastName") IN (
        'Seed User 10',
        'Seed User 1', 
        'Sarah Thompson',
        'Michael Chen',
        'Logan Price',
        'Jessica Martinez',
        'James Rodriguez',
        'Emily Davis',
        'David Wilson',
        'Daniel Miller',
        'Christopher Brown',
        'Amanda Garcia'
    )
);

DELETE FROM "tasks" WHERE "assignedToId" IN (
    SELECT id FROM "users" 
    WHERE ("firstName" || ' ' || "lastName") IN (
        'Seed User 10',
        'Seed User 1', 
        'Sarah Thompson',
        'Michael Chen',
        'Logan Price',
        'Jessica Martinez',
        'James Rodriguez',
        'Emily Davis',
        'David Wilson',
        'Daniel Miller',
        'Christopher Brown',
        'Amanda Garcia'
    )
);

DELETE FROM "tasks" WHERE "createdById" IN (
    SELECT id FROM "users" 
    WHERE ("firstName" || ' ' || "lastName") IN (
        'Seed User 10',
        'Seed User 1', 
        'Sarah Thompson',
        'Michael Chen',
        'Logan Price',
        'Jessica Martinez',
        'James Rodriguez',
        'Emily Davis',
        'David Wilson',
        'Daniel Miller',
        'Christopher Brown',
        'Amanda Garcia'
    )
);

DELETE FROM "documents" WHERE "uploadedById" IN (
    SELECT id FROM "users" 
    WHERE ("firstName" || ' ' || "lastName") IN (
        'Seed User 10',
        'Seed User 1', 
        'Sarah Thompson',
        'Michael Chen',
        'Logan Price',
        'Jessica Martinez',
        'James Rodriguez',
        'Emily Davis',
        'David Wilson',
        'Daniel Miller',
        'Christopher Brown',
        'Amanda Garcia'
    )
);

DELETE FROM "company_assets" WHERE "uploadedById" IN (
    SELECT id FROM "users" 
    WHERE ("firstName" || ' ' || "lastName") IN (
        'Seed User 10',
        'Seed User 1', 
        'Sarah Thompson',
        'Michael Chen',
        'Logan Price',
        'Jessica Martinez',
        'James Rodriguez',
        'Emily Davis',
        'David Wilson',
        'Daniel Miller',
        'Christopher Brown',
        'Amanda Garcia'
    )
);

DELETE FROM "messages" WHERE "senderId" IN (
    SELECT id FROM "users" 
    WHERE ("firstName" || ' ' || "lastName") IN (
        'Seed User 10',
        'Seed User 1', 
        'Sarah Thompson',
        'Michael Chen',
        'Logan Price',
        'Jessica Martinez',
        'James Rodriguez',
        'Emily Davis',
        'David Wilson',
        'Daniel Miller',
        'Christopher Brown',
        'Amanda Garcia'
    )
);

DELETE FROM "calendar_events" WHERE "organizerId" IN (
    SELECT id FROM "users" 
    WHERE ("firstName" || ' ' || "lastName") IN (
        'Seed User 10',
        'Seed User 1', 
        'Sarah Thompson',
        'Michael Chen',
        'Logan Price',
        'Jessica Martinez',
        'James Rodriguez',
        'Emily Davis',
        'David Wilson',
        'Daniel Miller',
        'Christopher Brown',
        'Amanda Garcia'
    )
);

DELETE FROM "notifications" WHERE "recipientId" IN (
    SELECT id FROM "users" 
    WHERE ("firstName" || ' ' || "lastName") IN (
        'Seed User 10',
        'Seed User 1', 
        'Sarah Thompson',
        'Michael Chen',
        'Logan Price',
        'Jessica Martinez',
        'James Rodriguez',
        'Emily Davis',
        'David Wilson',
        'Daniel Miller',
        'Christopher Brown',
        'Amanda Garcia'
    )
);

DELETE FROM "workflow_steps" WHERE "assignedToId" IN (
    SELECT id FROM "users" 
    WHERE ("firstName" || ' ' || "lastName") IN (
        'Seed User 10',
        'Seed User 1', 
        'Sarah Thompson',
        'Michael Chen',
        'Logan Price',
        'Jessica Martinez',
        'James Rodriguez',
        'Emily Davis',
        'David Wilson',
        'Daniel Miller',
        'Christopher Brown',
        'Amanda Garcia'
    )
);

DELETE FROM "workflow_steps" WHERE "completedById" IN (
    SELECT id FROM "users" 
    WHERE ("firstName" || ' ' || "lastName") IN (
        'Seed User 10',
        'Seed User 1', 
        'Sarah Thompson',
        'Michael Chen',
        'Logan Price',
        'Jessica Martinez',
        'James Rodriguez',
        'Emily Davis',
        'David Wilson',
        'Daniel Miller',
        'Christopher Brown',
        'Amanda Garcia'
    )
);

-- Finally, delete the users themselves
DELETE FROM "users" WHERE ("firstName" || ' ' || "lastName") IN (
    'Seed User 10',
    'Seed User 1', 
    'Sarah Thompson',
    'Michael Chen',
    'Logan Price',
    'Jessica Martinez',
    'James Rodriguez',
    'Emily Davis',
    'David Wilson',
    'Daniel Miller',
    'Christopher Brown',
    'Amanda Garcia'
);

-- Show remaining users
SELECT COUNT(*) as total_users FROM "users";
SELECT "firstName", "lastName", email FROM "users" ORDER BY "firstName";
