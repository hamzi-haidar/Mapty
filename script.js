'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const cancelBtn = document.querySelector('.btn--cancel');

// copyRight year
const year = new Date().getFullYear();
document.querySelector('.year').textContent = year;

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

////////////////////////////////////////
// Application Architecture
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #workoutEls = [];
  markers = [];

  constructor() {
    //get user position
    this._getPosition();

    //get data from local storage
    this._getLocalStorage();

    //attach event handlers
    form.addEventListener('submit', this._NewWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    cancelBtn.addEventListener('click', this._hideForm.bind(this));
    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));
    containerWorkouts.addEventListener(
      'click',
      this._openEditWorkout.bind(this)
    );
    containerWorkouts.addEventListener(
      'submit',
      this._submitEditForm.bind(this)
    );

    containerWorkouts.addEventListener('change', this._toggleEdit);

    // this.#deleteBtn.forEach(btn =>
    //   btn.addEventListener('click', this._deleteWorkout.bind(this))
    // );
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //handling clicks on map
    this.#map.on('click', this._showform.bind(this));

    this.#workouts.forEach(work => this._renderWorkoutMarker(work));
  }

  _showform(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm(e) {
    e.preventDefault();
    // empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => ((form.style.display = 'grid'), 1000));
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _NewWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //if workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('unvalid inputs');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('unvalid inputs');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // add new object to workout array
    this.#workouts.push(workout);
    // console.log(workout);

    //render workout on map as marker
    this._renderWorkoutMarker(workout);

    //render workout on list
    this._renderWorkout(workout);

    //hide form +clear input fields
    this._hideForm(e);

    //set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords);
    marker
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: true,
          closeOnClick: false,
          autoPan: true,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚴'} ${workout.description}`
      )
      .openPopup()
      .on(
        'click',
        this._moveToMarker.bind(this).bind(this._renderWorkoutMarker, workout)
      );
    this.markers.push(marker);
  }

  _renderWorkout(workout) {
    let html = `   
  
     <form class="edit-form" data-id = "${workout.id}">
    <div class="edit-form_heading">edit workout</div>
    <div class="form__row">
      <label class="form__label">Type</label>
      <select class="form__input form__input--type" data-id = "${workout.id}">
    ${
      workout.type === 'running'
        ? `<option value="running">Running</option>
      <option value="cycling">Cycling</option>`
        : `<option value="cycling">Cycling</option>
      <option value="running">Running</option>`
    }
     
     
      }
      </select>
    </div>
    <div class="form__row">
      <label class="form__label">Distance</label>
      <input class="form__input form__input--distance" placeholder="${
        workout.distance
      } km" />
    </div>
    <div class="form__row">
      <label class="form__label">Duration</label>
      <input
        class="form__input form__input--duration"
        placeholder="${workout.duration} min"
      />
    </div>
    <div class="form__row ${
      workout.type === 'running' ? '' : 'form__row--hidden'
    }">


      <label class="form__label">Cadence</label>
      <input
        class="form__input form__input--cadence"
        placeholder="${workout.cadence} step/min"
      />
    </div>
    <div class="form__row ${
      workout.type === 'cycling' ? '' : 'form__row--hidden'
    }">
      <label class="form__label">Elev Gain</label>
      <input
        class="form__input form__input--elevation"
        placeholder="${workout.elevationGain} meters"
      />
    </div>
    <div class="btn_container">
      <button class="form__btn btn--submit">OK</button>
      <button class="form__btn btn--cancel">cancel</button>
    </div>
  </form>
 
   <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <div class="workout-btns"> <button class="btn--edit  edit-${
        workout.type === 'running' ? 'running' : 'cycling'
      }">edit</button>
    <button class="btn--delete">×</button></div>
    <div class = "workout-heading"><h2 class="workout__title">${
      workout.description
    } </h2>  </div>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃' : '🚴'
      }</span>
      <span class="workout-distance workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout-duration workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running')
      html += ` 
  <div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.pace.toFixed(1)}</span>
    <span class="workout__unit">min/km</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">🦶🏼</span>
    <span class="workout__value">${workout.cadence}</span>
    <span class="workout__unit">spm</span>
  </div>
</li>`;
    if (workout.type === 'cycling')
      html += ` 
<div class="workout__details">
  <span class="workout__icon">⚡️</span>
  <span class="workout__value">${workout.speed.toFixed(1)}</span>
  <span class="workout__unit">km/h</span>
</div>
<div class="workout__details">
  <span class="workout__icon">⛰</span>
  <span class="workout__value">${workout.elevationGain}</span>
  <span class="workout__unit">m</span>
</div>
</li>`;

    form.insertAdjacentHTML('afterend', html);

    this.#workoutEls.push(document.querySelector('.workout'));
  }

  _openEditWorkout(e) {
    const editBtn = e.target.closest('.btn--edit');
    if (!editBtn) return;

    const workoutEl = e.target.closest('.workout');

    const editForms = Array.from(document.querySelectorAll('.edit-form'));

    const [editForm] = editForms.filter(
      el => el.dataset.id === workoutEl.dataset.id
    );

    workoutEl.style.display = 'none';
    editForm.style.display = 'grid';
    editForm.querySelector('.form__input--distance').focus();

    editForm
      .querySelector('.btn--cancel')
      .addEventListener('click', function (e) {
        e.preventDefault();
        workoutEl.style.display = 'grid';
        editForm.style.display = 'none';
      });
  }

  _toggleEdit(e) {
    const editForm = e.target.closest('.edit-form');

    if (!editForm) return;

    const inputType = editForm.querySelector('.form__input--type');
    if (e.target === inputType) {
      const inputCadence = editForm.querySelector('.form__input--cadence');
      const inputElevation = editForm.querySelector('.form__input--elevation');

      inputElevation
        .closest('.form__row')
        .classList.toggle('form__row--hidden');
      inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
      inputCadence.placeholder = 'step/min';
      inputElevation.placeholder = 'meters';
    }
  }

  _submitEditForm(e) {
    // e.preventDefault();

    const editForm = e.target.closest('.edit-form');
    console.log(editForm);

    if (editForm) {
      console.log('submited');
      const inputType = editForm.querySelector('.form__input--type');
      const inputDistance = editForm.querySelector('.form__input--distance');
      const inputDuration = editForm.querySelector('.form__input--duration');
      const inputCadence = editForm.querySelector('.form__input--cadence');
      const inputElevation = editForm.querySelector('.form__input--elevation');

      const [workoutEl] = this.#workoutEls.filter(
        el => el.dataset.id === editForm.dataset.id
      );

      const workouts = this.#workouts;
      const workout = workouts.find(el => el.id === workoutEl.dataset.id);

      const workoutIndex = workouts.indexOf(workout);

      const validInputs = (...inputs) =>
        inputs.every(inp => Number.isFinite(inp));
      const allPositive = (...inputs) => inputs.every(inp => inp > 0);

      const type = inputType.value;
      const distance = +inputDistance.value;
      const duration = +inputDuration.value;
      const [lat, lng] = workout.coords;

      let editWorkout;

      if (type === 'running') {
        const cadence = +inputCadence.value;
        // check if data is valid
        if (
          !validInputs(distance, duration, cadence) ||
          !allPositive(distance, duration, cadence)
        )
          return alert('unvalid inputs');

        editWorkout = new Running([lat, lng], distance, duration, cadence);
      }
      if (type === 'cycling') {
        const elevation = +inputElevation.value;

        if (
          !validInputs(distance, duration, elevation) ||
          !allPositive(distance, duration)
        )
          return alert('unvalid inputs');

        editWorkout = new Cycling([lat, lng], distance, duration, elevation);
      }

      workouts.splice(workoutIndex, 1, editWorkout);

      localStorage.setItem('workouts', JSON.stringify(workouts));

      editForm.style.display = 'none';
      workoutEl.style.display = 'grid';
    }
  }

  _deleteWorkout(e) {
    const deleteBtn = e.target.closest('.btn--delete');

    if (!deleteBtn) return;

    const workoutEl = e.target.closest('.workout');

    workoutEl.style.display = 'none';

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    const marker = this.markers.find(marker => {
      const { lat, lng } = marker.getLatLng();
      const markerCoords = [lat, lng];
      return markerCoords.join() === workout.coords.join();
    });

    this.#map.removeLayer(marker);

    const workoutsLs = JSON.parse(localStorage.getItem('workouts'));

    const workoutLs = workoutsLs.find(work => work.id === workout.id);

    const index = workoutsLs.indexOf(workoutLs);

    workoutsLs.splice(index, 1);

    localStorage.setItem('workouts', JSON.stringify(workoutsLs));
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    this.#workoutEls.forEach(
      el => (el.style.background = 'var(--color-dark--2)')
    );
    this.#workoutEls.forEach(el => (el.style.color = '#ececec'));

    workoutEl.style.background = '#aaa';
    workoutEl.style.color = 'black';

    // change delete button color
    document
      .querySelectorAll('.btn--delete')
      .forEach(el => (el.style.color = 'var(--color-light--1)'));
    const deleteBtn = workoutEl.querySelector('.btn--delete');
    deleteBtn.style.color = 'black';

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    // console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    const popup = L.popup(workout.coords, {
      content: `${workout.type === 'running' ? '🏃' : '🚴'} ${
        workout.description
      }`,
      offset: L.point(1, -27),
      maxWidth: 250,
      minWidth: 100,
      autoClose: true,
      closeOnClick: false,
      autoPan: false,
      className: `${workout.type}-popup`,
    });
    popup.openOn(this.#map);
    if (e.target.closest('.btn--delete')) {
      popup.close();
    }
  }

  _moveToMarker(workout) {
    const workEl = this.#workoutEls.find(
      work => work.dataset.id === workout.id
    );

    this.#workoutEls.forEach(
      el => (el.style.background = 'var(--color-dark--2)')
    );
    this.#workoutEls.forEach(el => (el.style.color = '#ececec'));

    workEl.style.background = '#aaa';
    workEl.style.color = 'black';
    workEl.scrollIntoView({ behavior: 'smooth' });

    document
      .querySelectorAll('.btn--delete')
      .forEach(el => (el.style.color = 'var(--color-light--1)'));

    const deleteBtn = workEl.querySelector('.btn--delete');

    deleteBtn.style.color = 'black';
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  // you can use this by calling it in the console (app.reset()) to remove local storage and reload
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
const app = new App();
