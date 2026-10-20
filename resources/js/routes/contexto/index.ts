import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition } from './../../wayfinder'
/**
* @see \App\Http\Controllers\Web\ContextoController::update
 * @see app/Http/Controllers/Web/ContextoController.php:19
 * @route '/contexto'
 */
export const update = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: update.url(options),
    method: 'post',
})

update.definition = {
    methods: ["post"],
    url: '/contexto',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Web\ContextoController::update
 * @see app/Http/Controllers/Web/ContextoController.php:19
 * @route '/contexto'
 */
update.url = (options?: RouteQueryOptions) => {
    return update.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\ContextoController::update
 * @see app/Http/Controllers/Web/ContextoController.php:19
 * @route '/contexto'
 */
update.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: update.url(options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Web\ContextoController::update
 * @see app/Http/Controllers/Web/ContextoController.php:19
 * @route '/contexto'
 */
    const updateForm = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: update.url(options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Web\ContextoController::update
 * @see app/Http/Controllers/Web/ContextoController.php:19
 * @route '/contexto'
 */
        updateForm.post = (options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: update.url(options),
            method: 'post',
        })
    
    update.form = updateForm
const contexto = {
    update: Object.assign(update, update),
}

export default contexto