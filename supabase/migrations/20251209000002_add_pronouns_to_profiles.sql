ALTER TABLE profiles
ADD COLUMN pronouns TEXT CHECK (pronouns IN ('he/him', 'she/her', 'they/them', 'prefer not to answer'));
