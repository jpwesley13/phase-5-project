from sqlalchemy_serializer import SerializerMixin
from sqlalchemy.ext.associationproxy import association_proxy
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import validates

from config import db, bcrypt

class Region(db.Model, SerializerMixin):
    __tablename__ = 'regions'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String)

    locales = db.relationship('Locale', back_populates='region')

    serialize_rules = ('-locales.region',)

    @validates('name')
    def validate_name(self, key, name):
        regions = ["Kanto", "Johto", "Hoenn", "Sinnoh", "Unova", "Kalos", "Alola", "Galar", "Paldea", "Orre", "Ultra Space", "Kitakami", "Almia", "Oblivia", "Lental", "Uncharted"]
        if name not in regions:
            raise ValueError('Region not recognized. Please select from available options or confirm uncharted territory.')
        return name
    
class Pokedex(db.Model, SerializerMixin):
    __tablename__ = 'pokedexes'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))

    user = db.relationship('User', back_populates='pokedex')

    serialize_rules = ('-users.pokedex',)

class User(db.Model, SerializerMixin):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, nullable=False, unique=True)
    age = db.Column(db.Integer)
    _password_hash = db.Column(db.String, nullable=False)

    pokedex = db.relationship('Pokedex', uselist=False, back_populates='user')
    goals = db.relationship('Goal', back_populates='user')

    serialize_rules = ('-pokedex.user', '-goals.user')

    @hybrid_property
    def password_hash(self):
        raise AttributeError('Password hashes may not be viewed.')
    
    @password_hash.setter
    def password_hash(self, password):
        password_hash = bcrypt.generate_password_hash(password.encode('utf-8'))
        self._password_hash = password_hash.decode('utf-8')

    def authenticate(self, password):
        return bcrypt.check_password_hash(self._password_hash, password.encode('utf-8'))

    @validates('name')
    def validate_name(self, key, name):
        if not name:
            raise ValueError('Please enter a name.')
        return name
    
    @validates('age')
    def validate_age(self, key, age):
        if age < 10:
            raise ValueError('Trainers must be at least 10 years old.')
        return age

    def __repr__(self):
        return f'<User {self.id}: {self.username}, age: {self.age}>'
    
class Locale(db.Model, SerializerMixin):
    __tablename__ = 'locales'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    region_id = db.Column(db.Integer, db.ForeignKey('regions.id'))

    region = db.relationship('Region', back_populates='locales')

    serialize_rules = ('-region.locales',)

    @validates('name')
    def validate_name(self, key, name):
        if not name:
            raise ValueError('Locale must be named.')
        elif 25 < len(name) < 2:
            raise ValueError('Locale names must be between 2-25 characters long')
        return name

    def __repr__(self):
        return f'<Locale {self.id}: {self.name}>'
    
class Goal(db.Model, SerializerMixin):
    __tablename__ = 'goals'

    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String, nullable=False)
    target_date = db.Column(db.DateTime)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))

    user = db.relationship('User', back_populates='goals')

class Species(db.Model, SerializerMixin):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    types = db.Column(db.String, nullable=False)
    shiny = db.Column(db.Boolean, default=False)