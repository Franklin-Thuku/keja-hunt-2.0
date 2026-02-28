const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { auth } = require('../middleware/auth');

// Get all notifications for a user
router.get('/', auth, async (req, res) => {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select(`
        *,
        sender:users(name, email),
        relatedHouse:houses(title)
      `)
      .eq('recipient_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread notifications count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', req.user.id)
      .eq('read', false);
    
    if (error) throw error;
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', req.params.id)
      .eq('recipient_id', req.user.id)
      .select()
      .single();
    
    if (error || !notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', req.user.id)
      .eq('read', false);
    
    if (error) throw error;
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', req.params.id)
      .eq('recipient_id', req.user.id);
    
    if (error) throw error;
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create notification (internal function)
const createNotification = async (recipient_id, type, title, message, relatedData = {}) => {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert([{
        recipient_id,
        type,
        title,
        message,
        ...relatedData
      }])
      .select()
      .single();
    
    if (error) throw error;
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

module.exports = router;
module.exports.createNotification = createNotification;