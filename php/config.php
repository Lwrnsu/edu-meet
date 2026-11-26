<?php
/**
 * App-level constants for the Files / Tasks module.
 * (Database credentials are NOT here. They live in ../config/Database.php)
 */

const SESSION_USER_ID = 'user_id';          // $_SESSION key set by your login
const LOGIN_URL       = '../login.php';     // returned to the front end on 401

const DEV_MODE = true;                      // set to false in production (disables role switcher)

// users table mapping (adjust if the real users table differs)
const USERS_TABLE   = 'users';
const U_ID          = 'id';
const U_NAME_SQL    = '`name`';
const U_ROLE        = 'role';
const FACULTY_ROLES = ['faculty', 'teacher', 'instructor'];
const STUDENT_ROLES = ['student'];

// uploads
const ALLOWED    = ['pdf','doc','docx','ppt','pptx','xls','xlsx','txt','png','jpg','jpeg','zip'];
const VIEWABLE   = ['pdf','png','jpg','jpeg','txt'];
const MAX_BYTES  = 30 * 1024 * 1024;
const UPLOAD_DIR = __DIR__ . '/uploads/';

// class shown in the page banner (front end gets it from auth.me)
const CLASS_INFO = [
    'name' => 'Graphics and Visual Computing (LEC)',
    'code' => '45573 - CSP215A',
    'time' => 'T-6:00 PM - 8:00 PM',
];
