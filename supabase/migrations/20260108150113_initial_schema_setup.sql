/*
  # Initial Database Schema Setup

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `username` (text)
      - `workgroup_id` (uuid, nullable, foreign key)
      - `role` (text, default 'member')
      - `trial_ends_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `workgroups`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `passcode` (text, not null)
      - `created_at` (timestamptz)
      - `created_by` (uuid, references profiles)
    
    - `warehouses`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `workgroup_id` (uuid, foreign key)
      - `created_at` (timestamptz)
    
    - `storages`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `warehouse_id` (uuid, foreign key)
      - `workgroup_id` (uuid, foreign key)
      - `created_at` (timestamptz)
    
    - `items`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `quantity` (integer, default 0)
      - `restock_threshold` (integer, default 10)
      - `barcode` (text, nullable)
      - `price_per_unit` (numeric, nullable)
      - `storage_id` (uuid, foreign key)
      - `workgroup_id` (uuid, foreign key)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `defined_locations`
      - `id` (uuid, primary key)
      - `storage_id` (uuid, foreign key)
      - `row_index` (integer)
      - `col_index` (integer)
      - `label` (text)
      - `master_id` (uuid, nullable)
      - `created_at` (timestamptz)
    
    - `activity_logs`
      - `id` (uuid, primary key)
      - `workgroup_id` (uuid, foreign key)
      - `item_id` (uuid, nullable)
      - `item_name` (text)
      - `action` (text)
      - `change_amount` (integer)
      - `final_quantity` (integer)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users

  3. Indexes
    - Add indexes for common query patterns
*/

-- Create tables

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text,
  workgroup_id uuid,
  role text DEFAULT 'member',
  trial_ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workgroups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  passcode text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  workgroup_id uuid REFERENCES workgroups(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE CASCADE,
  workgroup_id uuid REFERENCES workgroups(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  quantity integer DEFAULT 0,
  restock_threshold integer DEFAULT 10,
  barcode text,
  price_per_unit numeric(10, 2),
  storage_id uuid REFERENCES storages(id) ON DELETE CASCADE,
  workgroup_id uuid REFERENCES workgroups(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS defined_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_id uuid REFERENCES storages(id) ON DELETE CASCADE,
  row_index integer NOT NULL,
  col_index integer NOT NULL,
  label text,
  master_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workgroup_id uuid REFERENCES workgroups(id) ON DELETE CASCADE,
  item_id uuid,
  item_name text,
  action text,
  change_amount integer,
  final_quantity integer,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key for workgroup_id in profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_workgroup_id_fkey'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_workgroup_id_fkey 
      FOREIGN KEY (workgroup_id) REFERENCES workgroups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workgroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE storages ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE defined_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: Users can read/update their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Workgroups: Members can view their workgroup
CREATE POLICY "Users can view their workgroup"
  ON workgroups FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT workgroup_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create workgroups"
  ON workgroups FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Warehouses: Workgroup members can manage
CREATE POLICY "Workgroup members can view warehouses"
  ON warehouses FOR SELECT
  TO authenticated
  USING (
    workgroup_id IN (
      SELECT workgroup_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Workgroup members can create warehouses"
  ON warehouses FOR INSERT
  TO authenticated
  WITH CHECK (
    workgroup_id IN (
      SELECT workgroup_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Workgroup members can update warehouses"
  ON warehouses FOR UPDATE
  TO authenticated
  USING (
    workgroup_id IN (
      SELECT workgroup_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Workgroup members can delete warehouses"
  ON warehouses FOR DELETE
  TO authenticated
  USING (
    workgroup_id IN (
      SELECT workgroup_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Storages: Workgroup members can manage
CREATE POLICY "Workgroup members can view storages"
  ON storages FOR SELECT
  TO authenticated
  USING (
    workgroup_id IN (
      SELECT workgroup_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Workgroup members can create storages"
  ON storages FOR INSERT
  TO authenticated
  WITH CHECK (
    workgroup_id IN (
      SELECT workgroup_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Workgroup members can update storages"
  ON storages FOR UPDATE
  TO authenticated
  USING (
    workgroup_id IN (
      SELECT workgroup_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Workgroup members can delete storages"
  ON storages FOR DELETE
  TO authenticated
  USING (
    workgroup_id IN (
      SELECT workgroup_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Items: Workgroup members can manage
CREATE POLICY "Workgroup members can view items"
  ON items FOR SELECT
  TO authenticated
  USING (
    workgroup_id IN (
      SELECT workgroup_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Workgroup members can create items"
  ON items FOR INSERT
  TO authenticated
  WITH CHECK (
    workgroup_id IN (
      SELECT workgroup_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Workgroup members can update items"
  ON items FOR UPDATE
  TO authenticated
  USING (
    workgroup_id IN (
      SELECT workgroup_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Workgroup members can delete items"
  ON items FOR DELETE
  TO authenticated
  USING (
    workgroup_id IN (
      SELECT workgroup_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Defined Locations: Workgroup members can manage
CREATE POLICY "Workgroup members can view locations"
  ON defined_locations FOR SELECT
  TO authenticated
  USING (
    storage_id IN (
      SELECT id FROM storages WHERE workgroup_id IN (
        SELECT workgroup_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Workgroup members can create locations"
  ON defined_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    storage_id IN (
      SELECT id FROM storages WHERE workgroup_id IN (
        SELECT workgroup_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Workgroup members can update locations"
  ON defined_locations FOR UPDATE
  TO authenticated
  USING (
    storage_id IN (
      SELECT id FROM storages WHERE workgroup_id IN (
        SELECT workgroup_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Workgroup members can delete locations"
  ON defined_locations FOR DELETE
  TO authenticated
  USING (
    storage_id IN (
      SELECT id FROM storages WHERE workgroup_id IN (
        SELECT workgroup_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Activity Logs: Workgroup members can view
CREATE POLICY "Workgroup members can view activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    workgroup_id IN (
      SELECT workgroup_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Workgroup members can create activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    workgroup_id IN (
      SELECT workgroup_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_workgroup_id ON profiles(workgroup_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_workgroup_id ON warehouses(workgroup_id);
CREATE INDEX IF NOT EXISTS idx_storages_workgroup_id ON storages(workgroup_id);
CREATE INDEX IF NOT EXISTS idx_storages_warehouse_id ON storages(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_items_workgroup_id ON items(workgroup_id);
CREATE INDEX IF NOT EXISTS idx_items_storage_id ON items(storage_id);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode);
CREATE INDEX IF NOT EXISTS idx_defined_locations_storage_id ON defined_locations(storage_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_workgroup_id ON activity_logs(workgroup_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Create RPC function for restock items
CREATE OR REPLACE FUNCTION get_restock_items()
RETURNS TABLE (
  id uuid,
  name text,
  quantity integer,
  restock_threshold integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.name, i.quantity, i.restock_threshold
  FROM items i
  INNER JOIN profiles p ON i.workgroup_id = p.workgroup_id
  WHERE p.id = auth.uid() AND i.quantity <= i.restock_threshold
  ORDER BY i.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC function for bulk updates
CREATE OR REPLACE FUNCTION bulk_update_item_quantities(updates jsonb)
RETURNS void AS $$
DECLARE
  item_update jsonb;
BEGIN
  FOR item_update IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    UPDATE items
    SET quantity = (item_update->>'new_quantity')::integer,
        updated_at = now()
    WHERE id = (item_update->>'id')::uuid;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
