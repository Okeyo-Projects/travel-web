-- Function to handle cascading soft delete
CREATE OR REPLACE FUNCTION public.cascade_soft_delete_experience()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if deleted_at was changed from NULL to a value (soft delete)
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        -- Soft delete associated reels
        UPDATE public.reels
        SET deleted_at = NEW.deleted_at
        WHERE experience_id = NEW.id
        AND deleted_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function
DROP TRIGGER IF EXISTS on_experience_soft_delete ON public.experiences;
CREATE TRIGGER on_experience_soft_delete
    AFTER UPDATE OF deleted_at ON public.experiences
    FOR EACH ROW
    EXECUTE FUNCTION public.cascade_soft_delete_experience();
