import pygame
from pygame.locals import *
from OpenGL.GL import *
from OpenGL.GLU import *
import math
import numpy as np

class Camera:
    def __init__(self):
        self.x = 0
        self.y = 2
        self.z = -8
        self.rotation_x = 20
        self.rotation_y = 0
        
    def apply(self):
        glRotatef(self.rotation_x, 1, 0, 0)
        glRotatef(self.rotation_y, 0, 1, 0)
        glTranslatef(-self.x, -self.y, -self.z)

def init():
    """Initialize OpenGL settings"""
    glEnable(GL_DEPTH_TEST)
    glEnable(GL_LIGHTING)
    glEnable(GL_LIGHT0)
    glEnable(GL_LIGHT1)
    glEnable(GL_COLOR_MATERIAL)
    glColorMaterial(GL_FRONT_AND_BACK, GL_AMBIENT_AND_DIFFUSE)
    
    # Sun light (directional)
    glLight(GL_LIGHT0, GL_POSITION, [5, 10, 5, 0])  # Directional light
    glLight(GL_LIGHT0, GL_AMBIENT, [0.3, 0.3, 0.3, 1])
    glLight(GL_LIGHT0, GL_DIFFUSE, [0.9, 0.9, 0.8, 1])
    glLight(GL_LIGHT0, GL_SPECULAR, [1, 1, 1, 1])
    
    # Ambient light
    glLight(GL_LIGHT1, GL_POSITION, [0, 1, 0, 0])
    glLight(GL_LIGHT1, GL_AMBIENT, [0.2, 0.2, 0.25, 1])
    glLight(GL_LIGHT1, GL_DIFFUSE, [0.3, 0.3, 0.35, 1])
    
    # Set background color (sky blue)
    glClearColor(0.5, 0.7, 0.9, 1.0)
    
    # Enable smooth shading
    glShadeModel(GL_SMOOTH)

def draw_ground(size=20):
    """Draw a ground plane"""
    glColor3f(0.2, 0.6, 0.2)  # Green grass color
    glBegin(GL_QUADS)
    glNormal3f(0, 1, 0)
    glVertex3f(-size, 0, -size)
    glVertex3f(size, 0, -size)
    glVertex3f(size, 0, size)
    glVertex3f(-size, 0, size)
    glEnd()
    
    # Draw grid lines on ground
    glColor3f(0.15, 0.5, 0.15)
    glLineWidth(1.0)
    glBegin(GL_LINES)
    for i in range(-size, size + 1, 2):
        # Lines along X axis
        glVertex3f(i, 0.01, -size)
        glVertex3f(i, 0.01, size)
        # Lines along Z axis
        glVertex3f(-size, 0.01, i)
        glVertex3f(size, 0.01, i)
    glEnd()

def draw_tree(x, z, height=2):
    """Draw a simple tree"""
    # Trunk
    glPushMatrix()
    glTranslatef(x, height/2, z)
    glColor3f(0.4, 0.2, 0.1)  # Brown
    quad = gluNewQuadric()
    gluCylinder(quad, 0.1, 0.1, height, 8, 1)
    gluDeleteQuadric(quad)
    glPopMatrix()
    
    # Leaves (cone)
    glPushMatrix()
    glTranslatef(x, height, z)
    glColor3f(0.1, 0.5, 0.1)  # Dark green
    quad = gluNewQuadric()
    gluCylinder(quad, 0.5, 0, height * 0.8, 8, 1)
    gluDeleteQuadric(quad)
    glPopMatrix()

def draw_building(x, z, width=1, height=2, depth=1):
    """Draw a simple building"""
    glPushMatrix()
    glTranslatef(x, height/2, z)
    glColor3f(0.6, 0.6, 0.5)  # Gray
    
    # Draw cube for building
    vertices = [
        [-width/2, -height/2, -depth/2], [width/2, -height/2, -depth/2],
        [width/2, height/2, -depth/2], [-width/2, height/2, -depth/2],
        [-width/2, -height/2, depth/2], [width/2, -height/2, depth/2],
        [width/2, height/2, depth/2], [-width/2, height/2, depth/2]
    ]
    
    faces = [
        [0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1],
        [2, 6, 7, 3], [0, 3, 7, 4], [1, 5, 6, 2]
    ]
    
    glBegin(GL_QUADS)
    for face in faces:
        # Calculate normal
        v1 = np.array(vertices[face[1]]) - np.array(vertices[face[0]])
        v2 = np.array(vertices[face[2]]) - np.array(vertices[face[0]])
        normal = np.cross(v1, v2)
        normal = normal / np.linalg.norm(normal)
        glNormal3fv(normal)
        for vertex in face:
            glVertex3fv(vertices[vertex])
    glEnd()
    
    # Roof
    glColor3f(0.5, 0.2, 0.1)  # Brown roof
    glBegin(GL_TRIANGLES)
    # Front roof
    glNormal3f(0, 0.5, 1)
    glVertex3f(-width/2, height/2, -depth/2)
    glVertex3f(width/2, height/2, -depth/2)
    glVertex3f(0, height/2 + 0.3, 0)
    # Back roof
    glNormal3f(0, 0.5, -1)
    glVertex3f(-width/2, height/2, depth/2)
    glVertex3f(width/2, height/2, depth/2)
    glVertex3f(0, height/2 + 0.3, 0)
    glEnd()
    
    glPopMatrix()

def draw_terrain():
    """Draw some terrain variation"""
    glColor3f(0.3, 0.7, 0.3)
    glBegin(GL_TRIANGLES)
    # Small hill
    glNormal3f(0, 1, 0)
    glVertex3f(-3, 0, -3)
    glVertex3f(-1, 0.5, -3)
    glVertex3f(-3, 0, -1)
    glVertex3f(-1, 0.5, -3)
    glVertex3f(-1, 0.5, -1)
    glVertex3f(-3, 0, -1)
    glEnd()

def draw_sky_sphere(radius=50):
    """Draw a simple sky dome"""
    glPushMatrix()
    glColor3f(0.5, 0.7, 0.9)  # Sky blue
    glDisable(GL_LIGHTING)
    quad = gluNewQuadric()
    gluSphere(quad, radius, 20, 20)
    gluDeleteQuadric(quad)
    glEnable(GL_LIGHTING)
    glPopMatrix()

def draw_sun():
    """Draw the sun in the sky"""
    glPushMatrix()
    glTranslatef(8, 8, 5)
    glDisable(GL_LIGHTING)
    glColor3f(1, 1, 0.7)  # Yellow
    quad = gluNewQuadric()
    gluSphere(quad, 0.5, 16, 16)
    gluDeleteQuadric(quad)
    glEnable(GL_LIGHTING)
    glPopMatrix()

def main():
    pygame.init()
    display = (1200, 800)
    pygame.display.set_mode(display, DOUBLEBUF | OPENGL)
    pygame.display.set_caption("3D Environment Scene - Python")
    
    # Set up perspective
    gluPerspective(60, (display[0] / display[1]), 0.1, 100.0)
    
    camera = Camera()
    init()
    
    clock = pygame.time.Clock()
    angle = 0
    
    # Mouse control
    mouse_sensitivity = 0.5
    pygame.mouse.set_visible(False)
    pygame.event.set_grab(True)
    
    running = True
    while running:
        dt = clock.tick(60) / 1000.0  # Delta time in seconds
        
        keys = pygame.key.get_pressed()
        
        # Camera movement
        move_speed = 5 * dt
        if keys[K_w]:
            camera.z += move_speed * math.cos(math.radians(camera.rotation_y))
            camera.x += move_speed * math.sin(math.radians(camera.rotation_y))
        if keys[K_s]:
            camera.z -= move_speed * math.cos(math.radians(camera.rotation_y))
            camera.x -= move_speed * math.sin(math.radians(camera.rotation_y))
        if keys[K_a]:
            camera.x -= move_speed * math.cos(math.radians(camera.rotation_y))
            camera.z += move_speed * math.sin(math.radians(camera.rotation_y))
        if keys[K_d]:
            camera.x += move_speed * math.cos(math.radians(camera.rotation_y))
            camera.z -= move_speed * math.sin(math.radians(camera.rotation_y))
        if keys[K_SPACE]:
            camera.y += move_speed
        if keys[K_LSHIFT]:
            camera.y -= move_speed
        
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
            elif event.type == pygame.MOUSEMOTION:
                dx, dy = event.rel
                camera.rotation_y += dx * mouse_sensitivity
                camera.rotation_x -= dy * mouse_sensitivity
                camera.rotation_x = max(-90, min(90, camera.rotation_x))
        
        # Clear screen
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)
        
        # Reset transformations
        glLoadIdentity()
        
        # Apply camera
        camera.apply()
        
        # Draw sky (background)
        draw_sun()
        
        # Draw ground
        draw_ground(30)
        
        # Draw terrain
        draw_terrain()
        
        # Draw trees
        tree_positions = [
            (-5, -5), (-8, -3), (-3, -8),
            (5, -5), (8, -3), (3, -8),
            (-5, 5), (-8, 3), (-3, 8),
            (5, 5), (8, 3), (3, 8)
        ]
        for x, z in tree_positions:
            draw_tree(x, z, height=2 + (x + z) % 3 * 0.3)
        
        # Draw buildings
        building_positions = [
            (-10, -10, 1.5, 2.5, 1.5),
            (10, -10, 1.5, 2.5, 1.5),
            (-10, 10, 1.5, 2.5, 1.5),
            (10, 10, 1.5, 2.5, 1.5),
            (0, -12, 2, 3, 2),
        ]
        for x, z, w, h, d in building_positions:
            draw_building(x, z, w, h, d)
        
        # Draw a rotating object in the center
        angle += 60 * dt
        glPushMatrix()
        glRotatef(angle, 0, 1, 0)
        glColor3f(0.8, 0.2, 0.2)
        quad = gluNewQuadric()
        gluSphere(quad, 0.5, 16, 16)
        gluDeleteQuadric(quad)
        glPopMatrix()
        
        pygame.display.flip()
    
    pygame.quit()

if __name__ == "__main__":
    main()
